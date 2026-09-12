export interface User {
  id: string;
  companyId?: string;
  companyCode: string;
  username: string;
  role: "ADMIN" | "DEALER" | "CUSTOMER";
}

export interface LoginRequest {
  companyCode: string;
  username: string;
  password: string;
}

export interface LoginResponse {
  accessToken: string;
  user: User;
}
