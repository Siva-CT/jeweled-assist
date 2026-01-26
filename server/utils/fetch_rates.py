import yfinance as yf
import json
import sys

def fetch_rates():
    try:
        # Fetch Gold (GC=F) and Silver (SI=F)
        # Using tickers that are commonly available. 
        # Note: GC=F is Gold Futures (USD/oz).
        # USDINR=X is USD to INR conversion.
        
        tickers = "GC=F SI=F USDINR=X"
        data = yf.download(tickers, period="1d", interval="1m", progress=False)
        
        # Get the latest close price
        # yfinance returns a DataFrame. We need the last valid value.
        
        # Accessing data safely
        gold_oz_usd = data['Close']['GC=F'].iloc[-1]
        silver_oz_usd = data['Close']['SI=F'].iloc[-1]
        usd_inr = data['Close']['USDINR=X'].iloc[-1]
        
        # Conversions
        # 1 Troy Ounce = 31.1035 grams
        gold_gram_inr = (gold_oz_usd / 31.1035) * usd_inr
        silver_gram_inr = (silver_oz_usd / 31.1035) * usd_inr
        
        # Helper to clean NaN
        def clean(val):
            import math
            if val is None or (isinstance(val, float) and math.isnan(val)):
                return 0
            return val

        result = {
            "status": "success",
            "gold_gram_inr": round(clean(gold_gram_inr), 2),
            "silver_gram_inr": round(clean(silver_gram_inr), 2),
            "usd_inr": round(clean(usd_inr), 2),
            "timestamp": str(data.index[-1])
        }
        
        # Ensure we output valid JSON (no NaNs)
        print(json.dumps(result))
        
    except Exception as e:
        error_result = {
            "status": "error",
            "message": str(e)
        }
        print(json.dumps(error_result))

if __name__ == "__main__":
    fetch_rates()
