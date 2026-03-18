import axios from 'axios';

export class UzumMarketAPI {
  private bearerToken: string;
  private shopId: string;
  private baseUrl = 'https://api-seller.uzum.uz';
  private imageUploaderUrl = 'https://images-uploader.uzum.uz';

  constructor(bearerToken: string, shopId: string) {
    this.bearerToken = bearerToken;
    this.shopId = shopId;
  }

  private getHeaders() {
    return {
      'Authorization': `Bearer ${this.bearerToken}`,
      'Content-Type': 'application/json',
      'Origin': 'https://seller.uzum.uz',
      'Referer': 'https://seller.uzum.uz/',
      'Accept-Language': 'uz-UZ',
      'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) Chrome/122.0.0.0'
    };
  }

  async getAccount() {
    const response = await axios.get(`${this.baseUrl}/api/seller/account`, {
      headers: this.getHeaders()
    });
    return response.data;
  }

  async getProduct(productId: number) {
    const response = await axios.get(`${this.baseUrl}/api/seller/shop/${this.shopId}/product`, {
      params: { productId },
      headers: this.getHeaders()
    });
    return response.data;
  }

  async createProduct(productData: any) {
    const response = await axios.post(`${this.baseUrl}/api/seller/shop/${this.shopId}/product/createProduct`, productData, {
      headers: this.getHeaders()
    });
    return response.data;
  }

  async editProduct(productData: any) {
    const response = await axios.post(`${this.baseUrl}/api/seller/shop/${this.shopId}/product/editProduct`, productData, {
      headers: this.getHeaders()
    });
    return response.data;
  }

  async sendSkuData(payload: any) {
    const response = await axios.post(`${this.baseUrl}/api/seller/shop/${this.shopId}/product/sendSkuData`, payload, {
      headers: this.getHeaders()
    });
    return response.data;
  }

  async uploadImage(imageBuffer: Buffer) {
    const formData = new FormData();
    // In Node.js environment, we can append a Buffer directly as long as it has a filename
    // or wrap it in a Blob specifically for browser-like FormData if using Node 18+
    const blob = new Blob([new Uint8Array(imageBuffer)], { type: 'image/jpeg' });
    formData.append('file', blob, 'image.jpg');
    formData.append('tags', 'product,product_3x4');

    const response = await axios.post(`${this.imageUploaderUrl}/upload`, formData, {
      headers: {
        ...this.getHeaders(),
        // axios usually sets content-type automatically for FormData, 
        // but we'll let it handle the boundary
        'Content-Type': 'multipart/form-data'
      }
    });
    return response.data;
  }
}
