import os
import requests
import boto3
import firebase_admin
from firebase_admin import credentials, firestore
from flask import Flask, render_template, request, jsonify, send_from_directory, send_file
from werkzeug.utils import secure_filename
from dotenv import load_dotenv

# Load .env file if it exists
load_dotenv()

app = Flask(__name__)

# Firebase Configuration
# On Vercel, we can put the JSON content in an environment variable
firebase_initialized = False
try:
    firebase_key_path = os.path.join(os.path.dirname(__file__), 'firebase-key.json')
    if os.path.exists(firebase_key_path):
        cred = credentials.Certificate(firebase_key_path)
        firebase_admin.initialize_app(cred)
        firebase_initialized = True
    else:
        # Fallback for Vercel: Read from environment variable
        import json
        fb_content = os.getenv("FIREBASE_SERVICE_ACCOUNT")
        if fb_content:
            cred_dict = json.loads(fb_content)
            cred = credentials.Certificate(cred_dict)
            firebase_admin.initialize_app(cred)
            firebase_initialized = True
        else:
            print("FIREBASE_SERVICE_ACCOUNT topilmadi!")
except Exception as e:
    print(f"Firebase ulanishida xatolik: {e}")

def get_db():
    if not firebase_initialized:
        raise Exception("Firebase ulanishi tozalanmagan yoki API kalitlar xato kiritilgan (Environment Variable tekshiring).")
    return firestore.client()


# Yandex Cloud S3 Configuration

# Yandex Cloud S3 Configuration
YANDEX_ACCESS_KEY = os.getenv("YANDEX_ACCESS_KEY")
YANDEX_SECRET_KEY = os.getenv("YANDEX_SECRET_KEY")
BUCKET_NAME = os.getenv("BUCKET_NAME", "savdomarketimag")
# API Endpoint for boto3
S3_ENDPOINT = "https://s3.yandexcloud.net"
# Public URL endpoint for browser
PUBLIC_ENDPOINT = "https://storage.yandexcloud.net"

s3_client = boto3.client(
    "s3",
    aws_access_key_id=YANDEX_ACCESS_KEY,
    aws_secret_access_key=YANDEX_SECRET_KEY,
    endpoint_url=S3_ENDPOINT
)

@app.route('/')
def index():
    return render_template('index.html')

@app.route('/api/products')
def get_products():
    try:
        db = get_db()
        docs = db.collection('products').stream()
        
        products = []
        # Get all images from S3 once to optimize
        try:
            s3_objects = s3_client.list_objects_v2(Bucket=BUCKET_NAME, Prefix='images/')
            all_files = [obj['Key'] for obj in s3_objects.get('Contents', [])]
        except Exception:
            all_files = []

        for doc in docs:
            product_data = doc.to_dict()
            item_id = product_data.get('id')
            
            # Filter S3 images for this product
            prefix = f"images/{item_id}/"
            product_images = [f"{PUBLIC_ENDPOINT}/{BUCKET_NAME}/{f}" for f in all_files if f.startswith(prefix)]
            
            products.append({
                'id': item_id,
                'name': product_data.get('name'),
                'price': product_data.get('price'),
                'local_images': sorted(product_images)
            })
        return jsonify(products)
    except Exception as e:
        return jsonify({'error': str(e)}), 500

@app.route('/api/upload', methods=['POST'])
def upload_image():
    try:
        item_id = request.form.get('id')
        if not item_id:
            return jsonify({'error': 'ID missing'}), 400
            
        if 'file' in request.files:
            file = request.files['file']
            if file.filename == '':
                return jsonify({'error': 'No file selected'}), 400
            
            filename = secure_filename(file.filename)
            s3_key = f"images/{item_id}/{filename}"
            
            s3_client.upload_fileobj(
                file, 
                BUCKET_NAME, 
                s3_key,
                ExtraArgs={'ACL': 'public-read', 'ContentType': file.content_type}
            )
            url = f"{PUBLIC_ENDPOINT}/{BUCKET_NAME}/{s3_key}"
            return jsonify({'success': True, 'url': url})
            
        elif 'url' in request.form:
            url = request.form.get('url')
            response = requests.get(url, timeout=10)
            if response.status_code == 200:
                ext = '.jpg'
                content_type = response.headers.get('content-type', '')
                if 'png' in content_type: ext = '.png'
                elif 'webp' in content_type: ext = '.webp'
                
                # Check current count in S3 for filename
                s3_objects = s3_client.list_objects_v2(Bucket=BUCKET_NAME, Prefix=f"images/{item_id}/")
                count = s3_objects.get('KeyCount', 0)
                filename = f"manual_{count + 1}{ext}"
                s3_key = f"images/{item_id}/{filename}"
                
                s3_client.put_object(
                    Bucket=BUCKET_NAME,
                    Key=s3_key,
                    Body=response.content,
                    ACL='public-read',
                    ContentType=content_type
                )
                res_url = f"{PUBLIC_ENDPOINT}/{BUCKET_NAME}/{s3_key}"
                return jsonify({'success': True, 'url': res_url})
                
        return jsonify({'error': 'No file or URL provided'}), 400
    except Exception as e:
        return jsonify({'error': str(e)}), 500

@app.route('/api/delete_image', methods=['POST'])
def delete_image():
    try:
        data = request.json
        item_id = data.get('id')
        filename = data.get('filename')
        if not item_id or not filename:
            return jsonify({'error': 'ID or filename missing'}), 400
        
        s3_key = f"images/{item_id}/{filename}"
        s3_client.delete_object(Bucket=BUCKET_NAME, Key=s3_key)
        return jsonify({'success': True})
    except Exception as e:
        return jsonify({'error': str(e)}), 500

@app.route('/api/delete_product', methods=['POST'])
def delete_product():
    try:
        data = request.json
        item_id = data.get('id')
        if not item_id:
            return jsonify({'error': 'ID missing'}), 400
        
        return perform_delete([item_id])
    except Exception as e:
        return jsonify({'error': str(e)}), 500

@app.route('/api/bulk_delete', methods=['POST'])
def bulk_delete():
    try:
        data = request.json
        ids = data.get('ids', [])
        if not ids:
            return jsonify({'error': 'IDlar tanlanmagan'}), 400
        
        return perform_delete(ids)
    except Exception as e:
        return jsonify({'error': str(e)}), 500

def perform_delete(item_ids):
    try:
        db = get_db()
        batch = db.batch()
        for item_id in item_ids:
            doc_ref = db.collection('products').document(str(item_id))
            batch.delete(doc_ref)
            
            # Delete from S3
            prefix = f"images/{item_id}/"
            objects_to_delete = s3_client.list_objects_v2(Bucket=BUCKET_NAME, Prefix=prefix)
            if 'Contents' in objects_to_delete:
                delete_keys = [{'Key': obj['Key']} for obj in objects_to_delete['Contents']]
                s3_client.delete_objects(Bucket=BUCKET_NAME, Delete={'Objects': delete_keys})
        
        batch.commit()
        return jsonify({'success': True})
    except Exception as e:
        return jsonify({'error': str(e)}), 500

@app.route('/api/update_product_name', methods=['POST'])
def update_product_name():
    try:
        data = request.json
        item_id = str(data.get('id'))
        new_name = data.get('name')
        
        if not item_id or not new_name:
            return jsonify({'error': 'ID or name missing'}), 400
            
        db = get_db()
        doc_ref = db.collection('products').document(item_id)
        doc_ref.update({'name': new_name})
        return jsonify({'success': True})
    except Exception as e:
        return jsonify({'error': str(e)}), 500

@app.route('/api/update_product_price', methods=['POST'])
def update_product_price():
    try:
        data = request.json
        item_id = str(data.get('id'))
        new_price = data.get('price')
        
        if not item_id or new_price is None:
            return jsonify({'error': 'ID or price missing'}), 400
            
        db = get_db()
        doc_ref = db.collection('products').document(item_id)
        doc_ref.update({'price': new_price})
        return jsonify({'success': True})
    except Exception as e:
        return jsonify({'error': str(e)}), 500

@app.route('/api/add_product', methods=['POST'])
def add_product():
    try:
        data = request.json
        item_id = str(data.get('id'))
        name = data.get('name', 'Nomsiz Mahsulot')
        price = data.get('price', 'Narx kiritilmagan')
        
        if not item_id:
            return jsonify({'error': 'ID kiritish majburiy'}), 400
            
        db = get_db()
        doc_ref = db.collection('products').document(item_id)
        if doc_ref.get().exists:
            return jsonify({'error': 'Bu ID ga ega mahsulot allaqachon mavjud'}), 400
            
        doc_ref.set({
            'id': item_id,
            'name': name,
            'price': price,
            'created_at': firestore.SERVER_TIMESTAMP
        })
        
        return jsonify({'success': True, 'product': {
            'id': item_id,
            'name': name,
            'price': price,
            'local_images': []
        }})
    except Exception as e:
        return jsonify({'error': str(e)}), 500

if __name__ == '__main__':
    app.run(debug=True, port=5000)
