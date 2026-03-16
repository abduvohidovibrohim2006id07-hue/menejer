import os
import io
import json
import time
import requests
import boto3
import pandas as pd
import firebase_admin
from firebase_admin import credentials, firestore
from flask import Flask, render_template, request, jsonify, send_file
import yt_dlp
import tempfile
import shutil
from werkzeug.utils import secure_filename
from dotenv import load_dotenv

# Load .env file if it exists
load_dotenv()

app = Flask(__name__)
app.config['MAX_CONTENT_LENGTH'] = 200 * 1024 * 1024  # 200 MB limit
GROQ_API_KEY = os.getenv("GROQ_API_KEY")

# ── Firebase ──────────────────────────────────────────────────────────────────
firebase_initialized = False
try:
    if not firebase_admin._apps:
        firebase_key_path = os.path.join(os.path.dirname(__file__), 'firebase-key.json')
        if os.path.exists(firebase_key_path):
            cred = credentials.Certificate(firebase_key_path)
            firebase_admin.initialize_app(cred)
            firebase_initialized = True
        else:
            fb_content = os.getenv("FIREBASE_SERVICE_ACCOUNT")
            if fb_content:
                cred_dict = json.loads(fb_content)
                cred = credentials.Certificate(cred_dict)
                firebase_admin.initialize_app(cred)
                firebase_initialized = True
            else:
                print("FIREBASE_SERVICE_ACCOUNT topilmadi!")
    else:
        firebase_initialized = True
except Exception as e:
    print(f"Firebase xatolik: {e}")
    # Agar biron-bir ilova mavjud bo'lsa, uni True deb hisoblaymiz
    if firebase_admin._apps:
        firebase_initialized = True

def get_db():
    if not firebase_initialized:
        raise Exception("Firebase ulanishi yo'q. Environment Variable tekshiring.")
    return firestore.client()

# ── Yandex S3 ─────────────────────────────────────────────────────────────────
YANDEX_ACCESS_KEY = os.getenv("YANDEX_ACCESS_KEY")
YANDEX_SECRET_KEY = os.getenv("YANDEX_SECRET_KEY")
BUCKET_NAME       = os.getenv("BUCKET_NAME", "savdomarketimag")
S3_ENDPOINT       = "https://s3.yandexcloud.net"
PUBLIC_ENDPOINT   = "https://storage.yandexcloud.net"

s3_client = boto3.client(
    "s3",
    aws_access_key_id=YANDEX_ACCESS_KEY,
    aws_secret_access_key=YANDEX_SECRET_KEY,
    endpoint_url=S3_ENDPOINT
)

# ── Yordamchi: URLdan rasm yuklab S3 ga joylash ───────────────────────────────
def upload_image_from_url(url, item_id, index):
    """
    Berilgan URL dan rasmni yuklab Yandex S3 ga joylaydi.
    Muvaffaqiyatli bo'lsa public URL qaytaradi, aks holda None.
    """
    try:
        url = str(url).strip()
        if not url or url.lower() == 'nan' or not url.startswith('http'):
            return None
        resp = requests.get(url, timeout=15)
        if resp.status_code != 200:
            return None

        content_type = resp.headers.get('content-type', 'image/jpeg')
        if 'png' in content_type: ext = '.png'
        elif 'webp' in content_type: ext = '.webp'
        elif 'mp4' in content_type: ext = '.mp4'
        elif 'webm' in content_type: ext = '.webm'
        elif 'video/' in content_type:
            ext = '.' + content_type.split('/')[-1].split(';')[0]
        else:
            url_ext = os.path.splitext(url.split('?')[0])[1].lower()
            ext = url_ext if url_ext in ('.jpg', '.jpeg', '.png', '.webp', '.mp4', '.mov', '.avi', '.webm') else '.jpg'

        filename  = f"import_{index}{ext}"
        s3_key    = f"images/{item_id}/{filename}"

        s3_client.put_object(
            Bucket=BUCKET_NAME,
            Key=s3_key,
            Body=resp.content,
            ACL='public-read',
            ContentType=content_type
        )
        return f"{PUBLIC_ENDPOINT}/{BUCKET_NAME}/{s3_key}"
    except Exception as ex:
        print(f"Rasm yuklanmadi ({url}): {ex}")
        return None

def download_social_video(url, item_id):
    """
    YouTube, Instagram, FB kabi saytlardan videoni yuklab vaqtinchalik faylga saqlaydi.
    """
    tmp_dir = tempfile.gettempdir()
    ydl_opts = {
        'format': 'bestvideo[ext=mp4]+bestaudio[ext=m4a]/best[ext=mp4]/best',
        'outtmpl': os.path.join(tmp_dir, f'social_{item_id}_%(id)s.%(ext)s'),
        'noplaylist': True,
        'quiet': True,
        'merge_output_format': 'mp4',
        'max_filesize': 200 * 1024 * 1024 # 200MB limit
    }
    try:
        with yt_dlp.YoutubeDL(ydl_opts) as ydl:
            info = ydl.extract_info(url, download=True)
            path = ydl.prepare_filename(info)
            # Ba'zida extension o'zgarishi mumkin (.mkv -> .mp4)
            if not os.path.exists(path):
                # .mp4 qidirish
                base = os.path.splitext(path)[0]
                if os.path.exists(base + ".mp4"): path = base + ".mp4"
                elif os.path.exists(base + ".mkv"): path = base + ".mkv"
                elif os.path.exists(base + ".webm"): path = base + ".webm"
            
            if os.path.exists(path) and os.path.getsize(path) > 1000: # Kamida 1KB
                return path
            return None
    except Exception as e:
        print(f"yt-dlp error: {e}")
        return None

# ── Routes ────────────────────────────────────────────────────────────────────

@app.route('/')
def index():
    return render_template('index.html')

@app.route('/api/debug')
def debug():
    """Vercel environment diagnostics"""
    import traceback
    result = {
        'firebase_initialized': firebase_initialized,
        'firebase_apps_count': len(firebase_admin._apps),
        'env_FIREBASE_SERVICE_ACCOUNT': bool(os.getenv('FIREBASE_SERVICE_ACCOUNT')),
        'env_YANDEX_ACCESS_KEY': bool(os.getenv('YANDEX_ACCESS_KEY')),
        'env_YANDEX_SECRET_KEY': bool(os.getenv('YANDEX_SECRET_KEY')),
        'env_BUCKET_NAME': os.getenv('BUCKET_NAME', 'savdomarketimag'),
        'firebase_key_file_exists': os.path.exists(
            os.path.join(os.path.dirname(__file__), 'firebase-key.json')
        ),
    }
    # Firestore test
    try:
        db = get_db()
        db.collection('_test_').limit(1).stream()
        result['firestore_connection'] = 'OK'
    except Exception as e:
        result['firestore_connection'] = f'ERROR: {e}'
    # S3 test
    try:
        s3_client.list_buckets()
        result['s3_connection'] = 'OK'
    except Exception as e:
        result['s3_connection'] = f'ERROR: {e}'
    return jsonify(result)

# ---------- PRODUCTS (Firestore) ----------
@app.route('/api/products')
def get_products():
    step = 'init'
    try:
        step = 'get_db'
        db   = get_db()

        step = 'firestore_stream'
        docs = list(db.collection('products').stream())

        step = 's3_list'
        try:
            s3_resp  = s3_client.list_objects_v2(Bucket=BUCKET_NAME, Prefix='images/')
            all_keys = [obj['Key'] for obj in s3_resp.get('Contents', [])]
        except Exception:
            all_keys = []

        step = 'build_list'
        products = []
        for doc in docs:
            p       = doc.to_dict()
            item_id = str(p.get('id', doc.id))
            prefix  = f"images/{item_id}/"
            imgs    = sorted([f"{PUBLIC_ENDPOINT}/{BUCKET_NAME}/{k}"
                              for k in all_keys if k.startswith(prefix)])
            products.append({
                'id':                item_id,
                'name':              p.get('name', 'Nomsiz'),
                'price':             p.get('price', '0'),
                'model':             p.get('model', ''),
                'brand':             p.get('brand', ''),
                'supplier':          p.get('supplier', ''),
                'category':          p.get('category', 'Boshqa'),
                'sku':               p.get('sku', ''),
                'group_sku':         p.get('group_sku', ''),
                'color':             p.get('color', ''),
                'description_short': p.get('description_short', ''),
                'description_full':  p.get('description_full', ''),
                'local_images':      imgs
            })
        return jsonify(products)
    except Exception as e:
        import traceback
        traceback.print_exc()
        return jsonify({'error': str(e), 'failed_at_step': step}), 500

# ---------- CATEGORIES ----------
@app.route('/api/categories', methods=['GET'])
def get_categories():
    try:
        db = get_db()
        docs = db.collection('categories').stream()
        cats = [doc.to_dict().get('name') for doc in docs]
        if not cats:
            # Seed default categories if empty
            defaults = ["Elektronika", "Aksessuarlar", "Maishiy Texnika", "Go'zallik", "Kiyim-kechak"]
            for c in defaults:
                db.collection('categories').add({'name': c})
            return jsonify(defaults)
        return jsonify(sorted(cats))
    except Exception as e:
        return jsonify({'error': str(e)}), 500

@app.route('/api/add_category', methods=['POST'])
def add_category():
    try:
        data = request.json
        name = data.get('name', '').strip()
        if not name:
            return jsonify({'error': 'Nom kiritilmadi'}), 400
        
        db = get_db()
        # Check if exists
        exists = db.collection('categories').where('name', '==', name).limit(1).get()
        if exists:
            return jsonify({'error': 'Bu kategoriya allaqachon mavjud'}), 400
            
        db.collection('categories').add({'name': name})
        return jsonify({'success': True})
    except Exception as e:
        return jsonify({'error': str(e)}), 500

@app.route('/api/update_category', methods=['POST'])
def update_category():
    try:
        data = request.json
        old_name = data.get('old_name')
        new_name = data.get('new_name', '').strip()
        if not old_name or not new_name:
            return jsonify({'error': 'Nomlar yetishmayapti'}), 400
        
        db = get_db()
        # Find category doc
        docs = db.collection('categories').where('name', '==', old_name).limit(1).get()
        if not docs:
            return jsonify({'error': 'Kategoriya topilmadi'}), 404
        
        # Update category doc
        docs[0].reference.update({'name': new_name})
        
        # Update all products with this category
        products = db.collection('products').where('category', '==', old_name).stream()
        batch = db.batch()
        for p in products:
            batch.update(p.reference, {'category': new_name})
        batch.commit()
        
        return jsonify({'success': True})
    except Exception as e:
        return jsonify({'error': str(e)}), 500

@app.route('/api/delete_category', methods=['POST'])
def delete_category():
    try:
        data = request.json
        name = data.get('name')
        if not name:
            return jsonify({'error': 'Nom kiritilmadi'}), 400
        
        db = get_db()
        docs = db.collection('categories').where('name', '==', name).limit(1).get()
        if not docs:
            return jsonify({'error': 'Kategoriya topilmadi'}), 404
        
        # Delete category doc
        docs[0].reference.delete()
        
        # Update products to "Boshqa" category
        products = db.collection('products').where('category', '==', name).stream()
        batch = db.batch()
        for p in products:
            batch.update(p.reference, {'category': 'Boshqa'})
        batch.commit()
        
        return jsonify({'success': True})
    except Exception as e:
        return jsonify({'error': str(e)}), 500

@app.route('/api/add_product', methods=['POST'])
def add_product():
    try:
        data    = request.json
        item_id = str(data.get('id', '')).strip()
        name    = data.get('name', 'Nomsiz Mahsulot')
        price   = data.get('price', '0')
        
        # Yangi maydonlar (default bo'sh)
        fields = {
            'id':                item_id,
            'name':              name,
            'price':             price,
            'model':             data.get('model', ''),
            'brand':             data.get('brand', ''),
            'supplier':          data.get('supplier', ''),
            'category':          data.get('category', 'Boshqa'),
            'sku':               data.get('sku', ''),
            'group_sku':         data.get('group_sku', ''),
            'color':             data.get('color', ''),
            'description_short': data.get('description_short', '')[:350],
            'description_full':  data.get('description_full', '')[:5000],
            'name_ru':           data.get('name_ru', ''),
            'description_short_ru': data.get('description_short_ru', '')[:350],
            'description_full_ru':  data.get('description_full_ru', '')[:5000],
            'created_at':        firestore.SERVER_TIMESTAMP,
            'updated_at':        firestore.SERVER_TIMESTAMP
        }

        if not item_id:
            return jsonify({'error': 'ID kiritish majburiy'}), 400

        db      = get_db()
        doc_ref = db.collection('products').document(item_id)
        if doc_ref.get().exists:
            return jsonify({'error': 'Bu ID allaqachon mavjud'}), 400

        doc_ref.set(fields)
        
        # Ensure category exists in categories collection
        cat_name = fields.get('category')
        if cat_name:
            db_cat = db.collection('categories').where('name', '==', cat_name).limit(1).get()
            if not db_cat:
                db.collection('categories').add({'name': cat_name})

        fields['local_images'] = []
        # SERVER_TIMESTAMP JSON'ga o'girilmaydi, shuning uchun o'chiramiz/yoki matn qilamiz
        if 'created_at' in fields: del fields['created_at']
        
        return jsonify({'success': True, 'product': fields})
    except Exception as e:
        return jsonify({'error': str(e)}), 500

@app.route('/api/update_product_name', methods=['POST'])
def update_product_name():
    try:
        data    = request.json
        item_id = str(data.get('id', ''))
        name    = data.get('name', '')
        if not item_id or not name:
            return jsonify({'error': 'ID yoki nom yo\'q'}), 400
        db = get_db()
        db.collection('products').document(item_id).update({'name': name})
        return jsonify({'success': True})
    except Exception as e:
        return jsonify({'error': str(e)}), 500

@app.route('/api/update_product_price', methods=['POST'])
def update_product_price():
    try:
        data    = request.json
        item_id = str(data.get('id', ''))
        price   = data.get('price')
        if not item_id or price is None:
            return jsonify({'error': 'ID yoki narx yo\'q'}), 400
        db = get_db()
        db.collection('products').document(item_id).update({'price': price})
        return jsonify({'success': True})
    except Exception as e:
        return jsonify({'error': str(e)}), 500

@app.route('/api/update_product_details', methods=['POST'])
def update_product_details():
    try:
        data    = request.json
        item_id = str(data.get('id', ''))
        if not item_id:
            return jsonify({'error': 'ID yo\'q'}), 400
        
        # Faqat mavjud maydonlarni yangilash
        fields = ['name', 'price', 'model', 'brand', 'supplier', 'category', 
                  'sku', 'group_sku', 'color', 'description_short', 'description_full',
                  'name_ru', 'description_short_ru', 'description_full_ru']
        update_data = {}
        for f in fields:
            if f in data:
                val = data[f]
                if f in ['description_short', 'description_short_ru']: val = str(val)[:350]
                if f in ['description_full', 'description_full_ru']:  val = str(val)[:5000]
                update_data[f] = val
        
        if update_data:
            update_data['updated_at'] = firestore.SERVER_TIMESTAMP
            db = get_db()
            db.collection('products').document(item_id).update(update_data)
            
            # Ensure category exists
            cat_name = update_data.get('category')
            if cat_name:
                db_cat = db.collection('categories').where('name', '==', cat_name).limit(1).get()
                if not db_cat:
                    db.collection('categories').add({'name': cat_name})
            
        return jsonify({'success': True})
    except Exception as e:
        return jsonify({'error': str(e)}), 500

@app.route('/api/delete_product', methods=['POST'])
def delete_product():
    try:
        data    = request.json
        item_id = data.get('id')
        if not item_id:
            return jsonify({'error': 'ID yo\'q'}), 400
        return perform_delete([item_id])
    except Exception as e:
        return jsonify({'error': str(e)}), 500

@app.route('/api/bulk_delete', methods=['POST'])
def bulk_delete():
    try:
        data = request.json
        ids  = data.get('ids', [])
        if not ids:
            return jsonify({'error': 'IDlar tanlanmagan'}), 400
        return perform_delete(ids)
    except Exception as e:
        return jsonify({'error': str(e)}), 500

# AI ENDPOINTS
@app.route('/api/get_ai_settings', methods=['GET'])
def get_ai_settings():
    try:
        db = get_db()
        doc = db.collection('ai_settings').document('general').get()
        if doc.exists:
            return jsonify(doc.to_dict())
        else:
            # Default settings
            defaults = {
                'translate_uz_ru': {
                    'model': 'llama-3.3-70b-versatile',
                    'prompt': 'Translate the following product name from Uzbek to Russian. Return ONLY the translated text without quotes or explanations. Text: {{text}}'
                },
                'translate_ru_uz': {
                    'model': 'llama-3.3-70b-versatile',
                    'prompt': 'Translate the following product name from Russian to Uzbek. Return ONLY the translated text without quotes or explanations. Text: {{text}}'
                },
                'translate_desc_uz_ru': {
                    'model': 'llama-3.3-70b-versatile',
                    'prompt': 'Translate the following product description from Uzbek to Russian. Return ONLY the translated text without quotes or explanations. Text: {{text}}'
                },
                'translate_desc_ru_uz': {
                    'model': 'llama-3.3-70b-versatile',
                    'prompt': 'Translate the following product description from Russian to Uzbek. Return ONLY the translated text without quotes or explanations. Text: {{text}}'
                },
                'generate_full': {
                    'vision_model': 'llama-3.2-11b-vision-preview',
                    'vision_prompt': 'Identify and describe this product in detail. Focus on visible features, colors, and design. Image: {{image_url}}',
                    'search_model': 'groq/compound',
                    'search_prompt': 'Search the internet and find technical specifications and key selling points for: {{name}} {{brand}} {{model}}. Visual context: {{vision_text}}',
                    'synthesis_model': 'llama-3.3-70b-versatile',
                    'synthesis_prompt': 'Generate a professional product description in Uzbek based on vision data: {{vision_text}} and research: {{search_text}}. Product: {{name}}. Output format JSON: {"name": "...", "short": "...", "full": "..."}',
                    'translate_model': 'llama-3.3-70b-versatile',
                    'translate_prompt': 'Translate this JSON fields "name", "short", "full" to Russian. Output ONLY the JSON. JSON: {{json}}'
                }
            }
            db.collection('ai_settings').document('general').set(defaults)
            return jsonify(defaults)
    except Exception as e:
        return jsonify({'error': str(e)}), 500

@app.route('/api/update_ai_settings', methods=['POST'])
def update_ai_settings():
    try:
        data = request.json
        db = get_db()
        db.collection('ai_settings').document('general').set(data, merge=True)
        return jsonify({'success': True})
    except Exception as e:
        return jsonify({'error': str(e)}), 500

@app.route('/api/ai_generate_full', methods=['POST'])
def ai_generate_full():
    try:
        api_key = os.getenv("GROQ_API_KEY")
        if not api_key:
            return jsonify({'error': 'Groq API key topilmadi'}), 400
        
        data      = request.json
        name      = data.get('name', '')
        brand     = data.get('brand', '')
        model_val = data.get('model', '')
        image_url = data.get('image_url', '')

        db = get_db()
        settings_doc = db.collection('ai_settings').document('general').get()
        settings = settings_doc.to_dict() if settings_doc.exists else {}
        config = settings.get('generate_full', {})

        headers = {
            "Authorization": f"Bearer {api_key}",
            "Content-Type": "application/json"
        }
        base_url = "https://api.groq.com/openai/v1/chat/completions"

        # Step 1: Vision
        vision_text = ""
        if image_url:
            v_model  = config.get('vision_model', 'llama-3.2-11b-vision-preview')
            v_prompt = config.get('vision_prompt', 'Identify and describe this product in detail.').replace('{{image_url}}', image_url)
            v_payload = {
                "model": v_model,
                "messages": [{
                    "role": "user",
                    "content": [
                        {"type": "text", "text": v_prompt},
                        {"type": "image_url", "image_url": {"url": image_url}}
                    ]
                }],
                "temperature": 0.1
            }
            v_res = requests.post(base_url, headers=headers, json=v_payload)
            if v_res.status_code == 200:
                vision_text = v_res.json()['choices'][0]['message']['content']

        # Step 2: Search (Compound)
        s_model  = config.get('search_model', 'groq/compound')
        s_prompt = config.get('search_prompt', 'Search specifications for: {{name}} {{brand}} {{model}}')\
            .replace('{{name}}', name)\
            .replace('{{brand}}', brand)\
            .replace('{{model}}', model_val)\
            .replace('{{vision_text}}', vision_text)
        
        s_payload = {
            "model": s_model,
            "messages": [{"role": "user", "content": s_prompt}],
            "temperature": 0.1
        }
        s_res = requests.post(base_url, headers=headers, json=s_payload)
        search_text = s_res.json()['choices'][0]['message']['content'] if s_res.status_code == 200 else ""

        # Step 3: Synthesis (Uzbek)
        syn_model = config.get('synthesis_model', 'llama-3.3-70b-versatile')
        syn_prompt_base = config.get('synthesis_prompt', 'Generate a professional product description for "{{name}}". Output format JSON: {"name": "...", "short": "...", "full": "..."}')
        if "json" not in syn_prompt_base.lower():
            syn_prompt_base += " Respond in JSON format."
            
        syn_prompt = syn_prompt_base\
            .replace('{{name}}', name)\
            .replace('{{vision_text}}', vision_text)\
            .replace('{{search_text}}', search_text)
        
        syn_payload = {
            "model": syn_model,
            "messages": [{"role": "user", "content": syn_prompt}],
            "temperature": 0.1,
            "response_format": {"type": "json_object"}
        }
        syn_res = requests.post(base_url, headers=headers, json=syn_payload)
        if syn_res.status_code != 200:
            return jsonify({'error': f"Synthesis Error: {syn_res.text}"}), 400
        
        result_content = syn_res.json()['choices'][0]['message']['content']
        result_uz = json.loads(result_content)

        # Step 4: Translation (Russian)
        tr_model = config.get('translate_model', 'llama-3.3-70b-versatile')
        tr_prompt_base = config.get('translate_prompt', 'Translate this JSON fields "name", "short", "full" to Russian. Output ONLY the JSON. JSON: {{json}}')
        if "json" not in tr_prompt_base.lower():
            tr_prompt_base += " Output must be in JSON."

        tr_prompt = tr_prompt_base.replace('{{json}}', json.dumps(result_uz))
        
        tr_payload = {
            "model": tr_model,
            "messages": [{"role": "user", "content": tr_prompt}],
            "temperature": 0.1,
            "response_format": {"type": "json_object"}
        }
        tr_res = requests.post(base_url, headers=headers, json=tr_payload)
        
        if tr_res.status_code == 200:
            result_ru = json.loads(tr_res.json()['choices'][0]['message']['content'])
        else:
            result_ru = result_uz

        result_uz = result_uz
        result_ru = result_ru

        return jsonify({
            'success': True,
            'uz': result_uz,
            'ru': result_ru
        })

    except Exception as e:
        return jsonify({'error': str(e)}), 500

@app.route('/api/ai_call', methods=['POST'])
def ai_call():
    try:
        api_key = os.getenv("GROQ_API_KEY")
        if not api_key:
            return jsonify({'error': 'Groq API key topilmadi'}), 400
        data    = request.json
        text    = data.get('text', '')
        action  = data.get('action')
        if not text or not action:
            return jsonify({'error': 'Tekst yoki amal kiritilmadi'}), 400
        db = get_db()
        settings_doc = db.collection('ai_settings').document('general').get()
        settings = settings_doc.to_dict() if settings_doc.exists else {}
        config = settings.get(action)
        if not config:
            return jsonify({'error': f'AI sozlamalari topilmadi: {action}'}), 400
        model  = config.get('model', 'llama-3.3-70b-versatile')
        prompt_tmpl = config.get('prompt', 'Translate: {{text}}')
        prompt = prompt_tmpl.replace('{{text}}', text)
        url = "https://api.groq.com/openai/v1/chat/completions"
        headers = { "Authorization": f"Bearer {api_key}", "Content-Type": "application/json" }
        payload = {
            "model": model,
            "messages": [{"role": "user", "content": prompt}],
            "temperature": 0.1
        }
        response = requests.post(url, headers=headers, json=payload)
        if response.status_code == 200:
            return jsonify({'result': response.json()['choices'][0]['message']['content'].strip()})
        else:
            return jsonify({'error': f"Groq Error: {response.status_code}"}), 400
    except Exception as e:
        return jsonify({'error': str(e)}), 500

def perform_delete(item_ids):
    try:
        db    = get_db()
        batch = db.batch()
        for item_id in item_ids:
            batch.delete(db.collection('products').document(str(item_id)))
            # S3 dan rasmlarni o'chirish
            prefix  = f"images/{item_id}/"
            s3_resp = s3_client.list_objects_v2(Bucket=BUCKET_NAME, Prefix=prefix)
            if 'Contents' in s3_resp:
                keys = [{'Key': obj['Key']} for obj in s3_resp['Contents']]
                s3_client.delete_objects(Bucket=BUCKET_NAME, Delete={'Objects': keys})
        batch.commit()
        return jsonify({'success': True})
    except Exception as e:
        return jsonify({'error': str(e)}), 500

# ---------- IMAGES & DIRECT S3 UPLOAD ----------
@app.route('/api/get_presigned_url', methods=['POST'])
def get_presigned_url():
    try:
        data = request.json
        item_id = data.get('id')
        orig_filename = data.get('filename', 'file.dat')
        content_type = data.get('contentType', 'application/octet-stream')
        
        if not item_id:
             return jsonify({'error': 'ID yo\'q'}), 400

        # Fayl nomini xavfsiz qilish va unikal qilish
        ext = os.path.splitext(orig_filename)[1].lower() or '.jpg'
        clean_name = secure_filename(os.path.splitext(orig_filename)[0]) or 'file'
        unique_name = f"{int(time.time())}_{clean_name}{ext}"
        
        s3_key = f"images/{item_id}/{unique_name}"
        
        # Presigned URL yaratish (PUT uchun)
        url = s3_client.generate_presigned_url(
            'put_object',
            Params={
                'Bucket': BUCKET_NAME,
                'Key': s3_key,
                'ContentType': content_type
            },
            ExpiresIn=600 
        )
        
        return jsonify({
            'success': True,
            'uploadUrl': url,
            'publicUrl': f"{PUBLIC_ENDPOINT}/{BUCKET_NAME}/{s3_key}"
        })
    except Exception as e:
        print(f"Presigned error: {e}")
        return jsonify({'error': str(e)}), 500

@app.route('/api/upload', methods=['POST'])
def upload_image():
    try:
        item_id = request.form.get('id')
        if not item_id:
            return jsonify({'error': 'ID yo\'q'}), 400

        if 'file' in request.files:
            file = request.files['file']
            if file.filename == '':
                return jsonify({'error': 'Fayl tanlanmagan'}), 400
            filename = secure_filename(file.filename)
            s3_key   = f"images/{item_id}/{filename}"
            s3_client.upload_fileobj(
                file, BUCKET_NAME, s3_key,
                ExtraArgs={'ACL': 'public-read', 'ContentType': file.content_type}
            )
            return jsonify({'success': True, 'url': f"{PUBLIC_ENDPOINT}/{BUCKET_NAME}/{s3_key}"})

        elif 'url' in request.form:
            url  = request.form.get('url')
            
            # Ijtimoiy tarmoq yoki HLS (.m3u8) ekanligini tekshirish
            social_domains = ['youtube.com', 'youtu.be', 'instagram.com', 'facebook.com', 'fb.watch', 'tiktok.com', '.m3u8']
            is_social = any(d in url.lower() for d in social_domains) or url.lower().endswith('.m3u8')
            
            if is_social:
                video_path = download_social_video(url, item_id)
                if video_path and os.path.exists(video_path):
                    ext = os.path.splitext(video_path)[1]
                    filename = os.path.basename(video_path)
                    s3_key = f"images/{item_id}/{filename}"
                    
                    with open(video_path, 'rb') as f:
                        s3_client.upload_fileobj(
                            f, BUCKET_NAME, s3_key,
                            ExtraArgs={'ACL': 'public-read', 'ContentType': 'video/mp4'}
                        )
                    os.remove(video_path) # Vaqtinchalik faylni o'chirish
                    return jsonify({'success': True, 'url': f"{PUBLIC_ENDPOINT}/{BUCKET_NAME}/{s3_key}"})
                else:
                    return jsonify({'error': "Video yuklab bo'lmadi. Havola noto'g'ri yoki cheklov mavjud."}), 400

            # Oddiy havola (Rasm yoki to'g'ridan-to'g'ri video)
            resp = requests.get(url, timeout=15)
            if resp.status_code == 200:
                content_type = resp.headers.get('content-type', '')
                if 'png' in content_type: ext = '.png'
                elif 'webp' in content_type: ext = '.webp'
                elif 'mp4' in content_type: ext = '.mp4'
                elif 'webm' in content_type: ext = '.webm'
                elif 'video/' in content_type: ext = '.' + content_type.split('/')[-1].split(';')[0]
                else: ext = '.jpg'

                count = s3_client.list_objects_v2(Bucket=BUCKET_NAME, Prefix=f"images/{item_id}/").get('KeyCount', 0)
                s3_key = f"images/{item_id}/manual_{count + 1}{ext}"
                s3_client.put_object(Bucket=BUCKET_NAME, Key=s3_key, Body=resp.content,
                                     ACL='public-read', ContentType=content_type)
                return jsonify({'success': True, 'url': f"{PUBLIC_ENDPOINT}/{BUCKET_NAME}/{s3_key}"})

        return jsonify({'error': 'Fayl yoki URL taqdim etilmagan'}), 400
    except Exception as e:
        return jsonify({'error': str(e)}), 500

@app.route('/api/delete_image', methods=['POST'])
def delete_image():
    try:
        data     = request.json
        item_id  = data.get('id')
        filename = data.get('filename')
        if not item_id or not filename:
            return jsonify({'error': 'ID yoki fayl nomi yo\'q'}), 400
        s3_client.delete_object(Bucket=BUCKET_NAME, Key=f"images/{item_id}/{filename}")
        return jsonify({'success': True})
    except Exception as e:
        return jsonify({'error': str(e)}), 500

# ---------- EXCEL IMPORT / EXPORT ----------

@app.route('/api/download_excel')
def download_excel():
    """
    Firestore dagi barcha mahsulotlarni Excel formatida yuklab beradi.
    Ustunlar: ID, Nom, Model, Brend, Yetkazib beruvchi, Kategoriya, SKU, GroupSKU, Rang, Narx, Qisqa Tavsif, To'liq Tavsif
    """
    try:
        db   = get_db()
        docs = db.collection('products').stream()
        # S3 dan barcha rasm manzillarini olish
        try:
            s3_resp  = s3_client.list_objects_v2(Bucket=BUCKET_NAME, Prefix='images/')
            all_keys = [obj['Key'] for obj in s3_resp.get('Contents', [])]
        except Exception:
            all_keys = []

        rows = []
        for doc in docs:
            p = doc.to_dict()
            item_id = str(p.get('id', doc.id))
            
            # Mahsulotning rasmlarini yig'ish
            prefix = f"images/{item_id}/"
            imgs = sorted([f"{PUBLIC_ENDPOINT}/{BUCKET_NAME}/{k}" for k in all_keys if k.startswith(prefix)])
            
            row = [
                item_id, 
                p.get('name', ''), 
                p.get('model', ''),
                p.get('brand', ''),
                p.get('supplier', ''),
                p.get('category', ''),
                p.get('sku', ''),
                p.get('group_sku', ''),
                p.get('color', ''),
                p.get('price', ''),
                p.get('description_short', ''),
                p.get('description_full', ''),
                p.get('name_ru', ''),
                p.get('description_short_ru', ''),
                p.get('description_full_ru', '')
            ]
            
            # 10 tagacha rasm URL ini qo'shish
            for i in range(10):
                row.append(imgs[i] if i < len(imgs) else '')
                
            rows.append(row)

        cols = ['ID', 'Nomi', 'Model', 'Brend', 'Yetkazib beruvchi', 'Kategoriya', 'SKU', 'Group SKU', 'Rang', 'Narx', 'Qisqa Tavsif', 'To\'liq Tavsif', 'Nomi (RU)', 'Qisqa Tavsif (RU)', 'To\'liq Tavsif (RU)']
        for i in range(1, 11):
            cols.append(f'Rasm {i}')
            
        df  = pd.DataFrame(rows, columns=cols)
        buf = io.BytesIO()
        with pd.ExcelWriter(buf, engine='openpyxl') as writer:
            df.to_excel(writer, index=False, sheet_name='Mahsulotlar')
        buf.seek(0)
        return send_file(buf, as_attachment=True,
                         download_name='mahsulotlar_baza.xlsx',
                         mimetype='application/vnd.openxmlformats-officedocument.spreadsheetml.sheet')
    except Exception as e:
        return jsonify({'error': str(e)}), 500


@app.route('/api/import_excel', methods=['POST'])
def import_excel():
    """
    Excel fayldan mahsulotlarni import qiladi.
    Ustun tartibi (index):
      0: ID, 1: Nomi, 2: Model, 3: Brend, 4: Yetkazib beruvchi, 5: Kategoriya, 
      6: SKU, 7: Group SKU, 8: Rang, 9: Narx, 10: Qisqa Tavsif, 11: To'liq Tavsif,
      12..21: Rasm URL'lari
    """
    try:
        if 'file' not in request.files:
            return jsonify({'error': 'Fayl tanlanmagan'}), 400
        file = request.files['file']
        if not file.filename:
            return jsonify({'error': 'Fayl nomi bo\'sh'}), 400

        # Bizga kerakli ustunlar xaritasi (Key -> Excel Column Name)
        # mahsulotlar_baza.xlsx dagi rasm ustuni "Rasm 10_x000d_" bo'lishi mumkinligi uchun qidirish mantiqini qo'shamiz
        cols_map = {
            'ID':                'ID',
            'name':              'Nomi',
            'model':             'Model',
            'brand':             'Brend',
            'supplier':          'Yetkazib beruvchi',
            'category':          'Kategoriya',
            'sku':               'SKU',
            'group_sku':         'Group SKU',
            'color':             'Rang',
            'price':             'Narx',
            'description_short': 'Qisqa Tavsif',
            'description_full':  'To\'liq Tavsif',
            'name_ru':           'Nomi (RU)',
            'description_short_ru': 'Qisqa Tavsif (RU)',
            'description_full_ru':  'To\'liq Tavsif (RU)'
        }

        # Mavjud ustun nomlarini aniqlash
        df = pd.read_excel(file)
        df_cols = df.columns.tolist()

        db    = get_db()
        existing_cats = {doc.to_dict().get('name') for doc in db.collection('categories').stream()}
        
        batch = db.batch()
        count = 0
        imported = 0
        skipped  = 0
        errors   = []

        for idx, row in df.iterrows():
            try:
                # Helper function to get value by column name, with stripping and nan handling
                def get_by_col(col_name, default=''):
                    if col_name in df_cols:
                        v = str(row[col_name]).strip()
                        return '' if v.lower() == 'nan' else v
                    return default

                # ID majburiy
                item_id = get_by_col('ID').split('.')[0]
                if not item_id or item_id.lower() == 'id':
                    skipped += 1
                    continue

                data = {
                    'id':                item_id,
                    'name':              get_by_col(cols_map['name'], 'Nomsiz'),
                    'model':             get_by_col(cols_map['model']),
                    'brand':             get_by_col(cols_map['brand']),
                    'supplier':          get_by_col(cols_map['supplier']),
                    'category':          get_by_col(cols_map['category'], 'Boshqa'),
                    'sku':               get_by_col(cols_map['sku']),
                    'group_sku':         get_by_col(cols_map['group_sku']),
                    'color':             get_by_col(cols_map['color']),
                    'price':             get_by_col(cols_map['price'], '0'),
                    'description_short': get_by_col(cols_map['description_short'])[:350],
                    'description_full':  get_by_col(cols_map['description_full'])[:5000],
                    'name_ru':           get_by_col(cols_map['name_ru']),
                    'description_short_ru': get_by_col(cols_map['description_short_ru'])[:350],
                    'description_full_ru':  get_by_col(cols_map['description_full_ru'])[:5000],
                    'updated_at':        firestore.SERVER_TIMESTAMP
                }

                doc_ref = db.collection('products').document(item_id)
                batch.set(doc_ref, data, merge=True)
                
                # Category registration
                cat_name = data['category']
                if cat_name and cat_name not in existing_cats:
                    db.collection('categories').add({'name': cat_name})
                    existing_cats.add(cat_name)
                
                count   += 1
                imported += 1

                # Rasmlar (Ustun nomi bo'yicha qidiramiz)
                img_num = 1
                for cname in df_cols:
                    # "Rasm 1", "Rasm 2" kabi boshlanuvchi yozuvlarni qidiramiz
                    if cname.startswith('Rasm'):
                        img_url = str(row[cname]).strip()
                        if img_url and img_url.lower() != 'nan' and img_url.startswith('http'):
                            upload_image_from_url(img_url, item_id, img_num)
                            img_num += 1

                if count % 50 == 0:
                    batch.commit()
                    batch = db.batch()
            except Exception as row_err:
                errors.append(f"Qator {idx}: {str(row_err)}")
                skipped += 1

        batch.commit()
        return jsonify({'success': True, 'imported': imported, 'skipped': skipped, 'row_errors': errors[:10]})
    except Exception as e:
        print(f"Import Excel Error: {e}")
        import traceback
        traceback.print_exc()
        return jsonify({'error': str(e)}), 500


if __name__ == '__main__':
    app.run(debug=True, port=5000)
