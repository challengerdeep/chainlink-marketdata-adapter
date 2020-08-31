interface InputData {
  base?: string;
  from?: string;
  coin?: string;
  quote?: string;
  to?: string;
  market?: string;
  method?: 'spot_exchange_rate' | 'spot_direct_exchange_rate' | 'vwap';
  vwap_proxy_asset?: string;
  do_inverse?: boolean;
}

interface InputParams {
  id: string;
  data: InputData;
}

interface ChainlinkResult {
  jobRunID: string;
  status?: string;
  error?: string;
  data?: {
    result: number
  };
}

type Callback = (statusCode: number, result: ChainlinkResult) => void;
