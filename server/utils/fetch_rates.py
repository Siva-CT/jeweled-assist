import yfinance as yf
import json
import sys
import os
from datetime import datetime
import pandas as pd

# --- Configuration ---
# All rates are toggleable via Environment Variables or Defaults
CONFIG = {
    "TICKERS": "GC=F SI=F USDINR=X",
    "INTERVAL": "5m",
    "PERIOD": "1d",
    "TROY_OZ_TO_GRAMS": 31.1035,
    "GOLD_PURITY_22K": 0.916,
    
    # India Market Adjustments (Defaults: OFF for raw API data, set env vars to enable)
    # Why Defaults OFF? To keep "base rate" clean. Set env var INCLUDE_TAXES=true to enable.
    "INCLUDE_TAXES": os.getenv("INCLUDE_TAXES", "false").lower() == "true",
    "IMPORT_DUTY": float(os.getenv("GOLD_IMPORT_DUTY", "0.155")), # ~15.5%
    "GST": float(os.getenv("GOLD_GST", "0.03"))            # 3%
}

def get_latest_valid_price(data, ticker):
    """
    Retrieves the last valid (non-NaN) closing price from the DataFrame.
    """
    try:
        # Extract the Series for the specific ticker
        if isinstance(data.columns, pd.MultiIndex):
            series = data['Close'][ticker]
        else:
            series = data['Close']
            
        # Drop NaNs and get the last value
        valid_series = series.dropna()
        if valid_series.empty:
            return None
            
        return float(valid_series.iloc[-1])
    except Exception as e:
        # Silent error log (internal debug only if needed)
        # sys.stderr.write(f"Error fetching {ticker}: {e}\n")
        return None

def fetch_rates():
    try:
        # 1. Fetch Data
        data = yf.download(
            CONFIG["TICKERS"], 
            period=CONFIG["PERIOD"], 
            interval=CONFIG["INTERVAL"], 
            progress=False,
            threads=True
        )
        
        if data.empty:
            raise Exception("No data received from Yahoo Finance")

        # 2. Extract Prices
        gold_oz_usd = get_latest_valid_price(data, 'GC=F')
        silver_oz_usd = get_latest_valid_price(data, 'SI=F')
        usd_inr = get_latest_valid_price(data, 'USDINR=X')

        # Validate Critical Data
        if None in [gold_oz_usd, silver_oz_usd, usd_inr]:
            raise Exception("One or more tickers returned NaN/Empty data")

        # 3. Conversion Logic
        # Gold: USD/oz -> INR/g (24K) -> INR/g (22K)
        gold_gram_24k_inr_base = (gold_oz_usd / CONFIG["TROY_OZ_TO_GRAMS"]) * usd_inr
        gold_gram_22k_inr = gold_gram_24k_inr_base * CONFIG["GOLD_PURITY_22K"]

        # Silver: USD/oz -> INR/g
        silver_gram_inr = (silver_oz_usd / CONFIG["TROY_OZ_TO_GRAMS"]) * usd_inr

        # 4. Tax Adjustments (Optional)
        if CONFIG["INCLUDE_TAXES"]:
            # Apply Import Duty + GST
            tax_multiplier = (1 + CONFIG["IMPORT_DUTY"]) * (1 + CONFIG["GST"])
            gold_gram_22k_inr *= tax_multiplier
            silver_gram_inr *= tax_multiplier

        # 5. Output Construction
        payload = {
            "status": "success",
            "timestamp": datetime.now().isoformat(),
            "gold_gram_22k_inr": round(gold_gram_22k_inr, 2),
            "silver_gram_inr": round(silver_gram_inr, 2),
            "usd_inr": round(usd_inr, 2),
            "source": "Yahoo Finance (Indicative)",
            "meta": {
                "tax_included": CONFIG["INCLUDE_TAXES"],
                "gold_purity": "22K (91.6%)"
            }
        }
        
        print(json.dumps(payload))

    except Exception as e:
        # Graceful Failure Response
        error_payload = {
            "status": "error",
            "message": str(e),
            "timestamp": datetime.now().isoformat()
        }
        print(json.dumps(error_payload))
        sys.exit(1)

if __name__ == "__main__":
    fetch_rates()
