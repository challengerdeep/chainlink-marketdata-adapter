interface InputData {
  base?: string;
  from?: string;
  coin?: string;
  quote?: string;
  to?: string;
  market?: string;
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
