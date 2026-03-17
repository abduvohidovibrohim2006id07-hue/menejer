from flask import Blueprint, jsonify, request
from app.services.product_service import ProductService

product_bp = Blueprint('product', __name__)

@product_bp.route('/products', methods=['GET'])
def get_products():
    return jsonify(ProductService.get_all())

@product_bp.route('/add_product', methods=['POST'])
def add_product():
    data = request.json
    success, message = ProductService.add_product(data)
    if success:
        return jsonify({'success': True})
    return jsonify({'error': message}), 400

@product_bp.route('/delete_product', methods=['POST'])
def delete_product():
    data = request.json
    item_id = data.get('id')
    if ProductService.delete_product(item_id):
        return jsonify({'success': True})
    return jsonify({'error': 'Delete failed'}), 500
