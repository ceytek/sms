export interface User {
  id: string;
  companyCode: string;
  username: string;
  role: "ADMIN" | "CUSTOMER";
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
