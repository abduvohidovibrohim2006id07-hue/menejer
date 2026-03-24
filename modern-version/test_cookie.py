import requests

YANDEX_COOKIE = """ymex=2089734514.yrts.1774374514; muid=; Session_id=3:1774374528.5.0.1774374528948:bFjm1Q:c4c8.1.2:1|2352017726.-1.0.3:1774374528|41:11796792.735010.HR0A1daARgO10USlU1yY-8wOs28; bh=EkEiQ2hyb21pdW0iO3Y9IjE0NiIsICJOb3QtQS5CcmFuZCI7dj0iMjQiLCAiR29vZ2xlIENocm9tZSI7dj0iMTQ2IhoDeDg2Ig4xNDYuMC43NjgwLjE1NCoCPzA6CSJXaW5kb3dzIkIGMTkuMC4wSgI2NFJbIkNocm9taXVtIjt2PSIxNDYuMC43NjgwLjE1NCIsIk5vdC1BLkJyYW5kIjt2PSIyNC4wLjAuMCIsIkdvb2dsZSBDaHJvbWUiO3Y9IjE0Ni4wLjc2ODAuMTU0ImCGnYvOBmoe3Mrh/wiS2KGxA5/P4eoD+/rw5w3r//32D5jXzocI; cycada=hKKOS/bU2VRiLtZojRriIoApfcwlNusMRvhR4jCGIXA=; yashr=2805971751774374488; suppress_order_notifications=1; yandexuid=1231307741774374488; _ym_uid=1774374490160032903; _ym_d=1774374491; yp=2089734528.udn.cDphYmR1dm9oaWRvdmlicm9oaW0yMDA2aWQwNUBnbWFpbC5jb20%3D; L=XDBnAWBkf1lhUHZxR1dHdnNVemNFd2x3NA8nTBBYISAGIiAPESgDKzkXAlMEZDkqfHEpLwMwWC9MCAU7.1774374528.1789215.325247.97dd21131619abcbc3d91033ca9acf24; ds-theme-preference=dark; server_request_id_market:index=1774374632779%2F4930c3c1ce70ae2512c04bc40114f63d%2F1; ds-theme-settings=system; _yasc=KA6TandMQmDIFCk/6t4LgguYz2NYZSf3loYlFfQwSujK3rFc13/U7vHek3PxR7X4JrvFAAfH0g==; i=uMi4u+GcQR3xbo6E/bBrWF2rcUsA7x4WaDxkUrC01HalPA5XVQtD2FE8wG+SwOAYHrqH7eJuaebDAv5q8EVnfuW05aI=; skid=9084971511774374488; visits=1774374488-1774374488-1774374488; receive-cookie-deprecation=1; sessar=1.1719225.CiDpUDT21fLNzL_258zNaqCMn2PnEXx3_ZNrXJBK5KKlPg.lPLwvjO4kX8M3I_LZfRjwdWeOGZW-951tbDAwD3iBkI; sessionid2=3:1774374528.5.0.1774374528948:bFjm1Q:c4c8.1.2:1|2352017726.-1.0.3:1774374528|41:11796792.735010.fakesign0000000000000000000; yandex_login=abduvohidovibrohim2006id05@gmail.com; upa_completed=1; _ym_isad=2; profileNotifications={%22showProfileRedDot%22:false}; yuidss=1231307741774374488; gdpr=0"""

TEST_URL = "https://market.yandex.uz/product--fen-shchetka-vgr-v-498-pokrytiye-titanovo-turmalinovoye-moshchnost-2000vt-ionizatsiya/4587183409"

def verify_cookie():
    headers = {
        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/146.0.0.0 Safari/537.36',
        'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,image/avif,image/webp,*/*;q=0.8',
        'Accept-Language': 'ru,en-US;q=0.9,en;q=0.8,uz;q=0.7',
        'Cookie': YANDEX_COOKIE.strip()
    }

    print("Retrying connection with updated headers...")
    
    try:
        res = requests.get(TEST_URL, headers=headers, timeout=15)
        if "showcaptcha" in res.url or "captcha" in res.text.lower():
            print("FAILED: Browser Profile check failed due to IP mismatch.")
        else:
            print("SUCCESS!")
    except Exception as e:
        print(f"Error: {e}")

if __name__ == '__main__':
    verify_cookie()
