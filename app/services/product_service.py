from app.core.firebase_client import FirebaseClient
from app.core.s3_client import S3Client
from firebase_admin import firestore

class ProductService:
    @staticmethod
    def get_all():
        try:
            db = FirebaseClient.get_db()
            # Stream products
            docs = db.collection('products').stream()
            products = []
            for doc in docs:
                p = doc.to_dict()
                p['id'] = doc.id
                # In real use, we'd also link images from S3 here
                products.append(p)
            return products
        except Exception as e:
            print(f"Error fetching products: {e}")
            return []

    @staticmethod
    def add_product(data):
        try:
            db = FirebaseClient.get_db()
            item_id = str(data.get('id')).strip()
            if not item_id:
                raise ValueError("Product ID is required")
            
            data['created_at'] = firestore.SERVER_TIMESTAMP
            data['updated_at'] = firestore.SERVER_TIMESTAMP
            
            db.collection('products').document(item_id).set(data)
            return True, "Success"
        except Exception as e:
            return False, str(e)

    @staticmethod
    def delete_product(item_id):
        try:
            db = FirebaseClient.get_db()
            db.collection('products').document(str(item_id)).delete()
            # Note: We should also delete images from S3 here
            return True
        except Exception as e:
            print(f"Delete failed: {e}")
            return False
