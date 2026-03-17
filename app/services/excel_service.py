import pandas as pd
import io
from app.core.firebase_client import FirebaseClient

class ExcelService:
    @staticmethod
    def export_products():
        try:
            db = FirebaseClient.get_db()
            docs = db.collection('products').stream()
            
            rows = []
            for doc in docs:
                p = doc.to_dict()
                rows.append({
                    'ID': doc.id,
                    'Nomi': p.get('name', ''),
                    'Narx': p.get('price', ''),
                    'Kategoriya': p.get('category', 'Boshqa')
                })
            
            df = pd.DataFrame(rows)
            buf = io.BytesIO()
            with pd.ExcelWriter(buf, engine='openpyxl') as writer:
                df.to_excel(writer, index=False)
            buf.seek(0)
            return buf
        except Exception as e:
            print(f"Export failed: {e}")
            return None
