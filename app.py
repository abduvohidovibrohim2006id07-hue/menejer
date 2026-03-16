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

# ---------- PRODUCTS (Firestore) ----------
@app.route('/api/products')
def get_products():
    try:
        db   = get_db()
        docs = db.collection('products').stream()

        # S3 dagi barcha fayllarni bir marta olish (optimizatsiya)
        try:
            s3_resp  = s3_client.list_objects_v2(Bucket=BUCKET_NAME, Prefix='images/')
            all_keys = [obj['Key'] for obj in s3_resp.get('Contents', [])]
        except Exception:
            all_keys = []

        products = []
        for doc in docs:
            p       = doc.to_dict()
            item_id = p.get('id', '')
            prefix  = f"images/{item_id}/"
            imgs    = sorted([f"{PUBLIC_ENDPOINT}/{BUCKET_NAME}/{k}"
                              for k in all_keys if k.startswith(prefix)])
            products.append({
                'id':           item_id,
                'name':         p.get('name', 'Nomsiz'),
                'price':        p.get('price', 'Narx kiritilmagan'),
                'local_images': imgs
            })
        return jsonify(products)
    except Exception as e:
        print(f"API Products Error: {e}")
        import traceback
        traceback.print_exc()
        return jsonify({'error': str(e)}), 500

@app.route('/api/add_product', methods=['POST'])
def add_product():
    try:
        data    = request.json
        item_id = str(data.get('id', '')).strip()
        name    = data.get('name', 'Nomsiz Mahsulot')
        price   = data.get('price', 'Narx kiritilmagan')

        if not item_id:
            return jsonify({'error': 'ID kiritish majburiy'}), 400

        db      = get_db()
        doc_ref = db.collection('products').document(item_id)
        if doc_ref.get().exists:
            return jsonify({'error': 'Bu ID allaqachon mavjud'}), 400

        doc_ref.set({'id': item_id, 'name': name, 'price': price,
                     'created_at': firestore.SERVER_TIMESTAMP})
        return jsonify({'success': True, 'product': {
            'id': item_id, 'name': name, 'price': price, 'local_images': []
        }})
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
    Ustunlar: A=ID  B=Nom  C=(bo'sh)  D=Narx
    """
    try:
        db   = get_db()
        docs = db.collection('products').stream()

        rows = []
        for doc in docs:
            p = doc.to_dict()
            rows.append([p.get('id', ''), p.get('name', ''), '', p.get('price', '')])

        df  = pd.DataFrame(rows, columns=['ID', 'Nom', '', 'Narx'])
        buf = io.BytesIO()
        with pd.ExcelWriter(buf, engine='openpyxl') as writer:
            df.to_excel(writer, index=False, sheet_name='Mahsulotlar')
        buf.seek(0)
        return send_file(buf, as_attachment=True,
                         download_name='mahsulotlar.xlsx',
                         mimetype='application/vnd.openxmlformats-officedocument.spreadsheetml.sheet')
    except Exception as e:
        return jsonify({'error': str(e)}), 500


@app.route('/api/import_excel', methods=['POST'])
def import_excel():
    """
    Excel fayldan mahsulotlarni import qiladi:
      - A ustun (0): ID
      - B ustun (1): Nom
      - D ustun (3): Narx
      - F..O ustun (5..14): Rasm URL'lari → Yandex S3 ga yuklanadi

    Mavjud mahsulotlar yangilanadi (merge=True), yangilari qo'shiladi.
    """
    try:
        if 'file' not in request.files:
            return jsonify({'error': 'Fayl tanlanmagan'}), 400
        file = request.files['file']
        if not file.filename:
            return jsonify({'error': 'Fayl nomi bo\'sh'}), 400

        df = pd.read_excel(file, header=None)

        db    = get_db()
        batch = db.batch()
        count = 0
        imported = 0
        skipped  = 0
        errors   = []

        for idx, row in df.iterrows():
            try:
                # ID
                raw_id  = str(row.iloc[0]).strip() if len(row) > 0 else ''
                item_id = raw_id.split('.')[0]
                if not item_id or item_id.lower() in ('nan', 'id', ''):
                    skipped += 1
                    continue

                # Nom
                name = str(row.iloc[1]).strip() if len(row) > 1 else 'Nomsiz'
                if name.lower() == 'nan':
                    name = 'Nomsiz'

                # Narx (D ustun = index 3)
                try:
                    price = str(row.iloc[3]).strip()
                    if price.lower() == 'nan':
                        price = 'Narx kiritilmagan'
                except:
                    price = 'Narx kiritilmagan'

                # Firestore ga yozish
                doc_ref = db.collection('products').document(item_id)
                batch.set(doc_ref, {
                    'id':         item_id,
                    'name':       name,
                    'price':      price,
                    'updated_at': firestore.SERVER_TIMESTAMP
                }, merge=True)
                
                count   += 1
                imported += 1

                # Rasm URL'lari (F..O)
                for img_idx, col_i in enumerate(range(5, 15)):
                    try:
                        if len(row) > col_i:
                            img_url = str(row.iloc[col_i]).strip()
                            if img_url and img_url.lower() != 'nan':
                                upload_image_from_url(img_url, item_id, img_idx + 1)
                    except:
                        continue

                if count % 200 == 0:
                    batch.commit()
                    batch = db.batch()
            except Exception as row_err:
                print(f"Row {idx} error: {row_err}")
                errors.append(str(row_err))
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
