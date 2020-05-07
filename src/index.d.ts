type Validator = (v: string) => boolean;

interface InputData {
  region: string;
  endpoint: string;
  params?: string;
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
