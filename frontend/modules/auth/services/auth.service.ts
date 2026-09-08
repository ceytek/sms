import { apiRequest } from "@/lib/api";
import { LoginRequest, LoginResponse, User } from "../types";

export const authService = {
  async login(data: LoginRequest): Promise<LoginResponse> {
    const response = await apiRequest<LoginResponse>("auth/login", {
      method: "POST",
      body: data,
    });

    if (typeof window !== "undefined") {
      localStorage.setItem("accessToken", response.accessToken);
      localStorage.setItem("user", JSON.stringify(response.user));
    }

    return response;
  },

  logout(): void {
    if (typeof window !== "undefined") {
      localStorage.removeItem("accessToken");
      localStorage.removeItem("user");
    }
  },

  getToken(): string | null {
    if (typeof window !== "undefined") {
      return localStorage.getItem("accessToken");
    }
    return null;
  },

  getUser(): User | null {
    if (typeof window !== "undefined") {
      const user = localStorage.getItem("user");
      return user ? JSON.parse(user) : null;
    }
    return null;
  },

  isAuthenticated(): boolean {
    return !!this.getToken();
  },
};
