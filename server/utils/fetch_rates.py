import yfinance as yf
import json
import sys

def fetch_rates():
    try:
        # GC=F (Gold), SI=F (Silver), USDINR=X
        tickers = "GC=F SI=F USDINR=X"
        data = yf.download(tickers, period="1d", interval="1m", progress=False)
        
        gold_oz_usd = data['Close']['GC=F'].iloc[-1]
        silver_oz_usd = data['Close']['SI=F'].iloc[-1]
        usd_inr = data['Close']['USDINR=X'].iloc[-1]
        
        # 1 Troy Oz = 31.1035g
        gold_gram_inr = (gold_oz_usd / 31.1035) * usd_inr
        silver_gram_inr = (silver_oz_usd / 31.1035) * usd_inr
        
        result = {
            "status": "success",
            "gold_gram_inr": round(float(gold_gram_inr), 2),
            "silver_gram_inr": round(float(silver_gram_inr), 2),
            "usd_inr": round(float(usd_inr), 2)
        }
        print(json.dumps(result))
        
    except Exception as e:
        error_result = { "status": "error", "message": str(e) }
        print(json.dumps(error_result))

if __name__ == "__main__":
    fetch_rates()
