type Validator = (v: string) => boolean;

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
  data?: any;
}

type Callback = (statusCode: number, result: ChainlinkResult) => void;
