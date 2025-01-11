export type Edek = {
  id?: number;
  edek: string;
  userPubKey: string;
  dataServicePubKey: string;
};

export type Response<D> = {
  code: string;
  message: string;
  details: string;
  data?: D;
};
