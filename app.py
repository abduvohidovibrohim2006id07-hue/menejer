import os
import io
import json
import requests
import boto3
import pandas as pd
import firebase_admin
from firebase_admin import credentials, firestore
from flask import Flask, render_template, request, jsonify, send_file
from werkzeug.utils import secure_filename
from dotenv import load_dotenv

# Load .env file if it exists
load_dotenv()

app = Flask(__name__)

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
        if 'png' in content_type:
            ext = '.png'
        elif 'webp' in content_type:
            ext = '.webp'
        else:
            # URL'dan extension olishga harakat
            url_ext = os.path.splitext(url.split('?')[0])[1].lower()
            ext = url_ext if url_ext in ('.jpg', '.jpeg', '.png', '.webp') else '.jpg'

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
            'created_at':        firestore.SERVER_TIMESTAMP
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
                  'sku', 'group_sku', 'color', 'description_short', 'description_full']
        update_data = {}
        for f in fields:
            if f in data:
                val = data[f]
                if f == 'description_short': val = str(val)[:350]
                if f == 'description_full':  val = str(val)[:5000]
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

# ---------- IMAGES ----------
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
            resp = requests.get(url, timeout=10)
            if resp.status_code == 200:
                content_type = resp.headers.get('content-type', '')
                ext   = '.png' if 'png' in content_type else '.webp' if 'webp' in content_type else '.jpg'
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

        rows = []
        for doc in docs:
            p = doc.to_dict()
            rows.append([
                p.get('id', ''), 
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
                p.get('description_full', '')
            ])

        cols = ['ID', 'Nomi', 'Model', 'Brend', 'Yetkazib beruvchi', 'Kategoriya', 'SKU', 'Group SKU', 'Rang', 'Narx', 'Qisqa Tavsif', 'To\'liq Tavsif']
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

        # header=0 - birinchi qator ustun nomlari deb hisoblaydi
        df = pd.read_excel(file)

        db    = get_db()
        # Pre-fetch existing categories to avoid redundant writes
        existing_cats = {doc.to_dict().get('name') for doc in db.collection('categories').stream()}
        
        batch = db.batch()
        count = 0
        imported = 0
        skipped  = 0
        errors   = []

        for idx, row in df.iterrows():
            try:
                # 0: ID
                item_id = str(row.iloc[0]).strip().split('.')[0]
                if not item_id or item_id.lower() in ('nan', 'id', ''):
                    skipped += 1
                    continue

                # Maydonlarni yig'ish (xatolikni oldini olish uchun index tekshiruvi bilan)
                def get_val(i, default=''):
                    if i < len(row):
                        v = str(row.iloc[i]).strip()
                        return '' if v.lower() == 'nan' else v
                    return default

                data = {
                    'id':                item_id,
                    'name':              get_val(1, 'Nomsiz'),
                    'model':             get_val(2),
                    'brand':             get_val(3),
                    'supplier':          get_val(4),
                    'category':          get_val(5, 'Boshqa'),
                    'sku':               get_val(6),
                    'group_sku':         get_val(7),
                    'color':             get_val(8),
                    'price':             get_val(9, '0'),
                    'description_short': get_val(10)[:350],
                    'description_full':  get_val(11)[:5000],
                    'updated_at':        firestore.SERVER_TIMESTAMP
                }

                doc_ref = db.collection('products').document(item_id)
                batch.set(doc_ref, data, merge=True)
                
                # Register new category if found in excel
                cat_name = data['category']
                if cat_name and cat_name not in existing_cats:
                    db.collection('categories').add({'name': cat_name})
                    existing_cats.add(cat_name)
                
                count   += 1
                imported += 1

                # Rasm URL'lari (12-ustundan boshlab)
                for img_idx, col_i in enumerate(range(12, 22)):
                    if col_i < len(row):
                        img_url = str(row.iloc[col_i]).strip()
                        if img_url and img_url.lower() != 'nan':
                            upload_image_from_url(img_url, item_id, img_idx + 1)

                if count % 100 == 0:
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
