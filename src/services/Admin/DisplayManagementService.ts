import axios from "axios";
import type {
  Display,
  DisplayAndon,
  DisplayFormData,
  DisplayAndonFormData,
  MoveDirection,
  ApiResponse
} from "@/types/Admin/DisplayManagement";

export class DisplayManagementService {
  private baseUrl: string;
  
  constructor(apiUrl: string) {
    this.baseUrl = `http://${apiUrl}/majsf_rest_api/api`;
  }

  async fetchDisplays(): Promise<Display[]> {
    try {
      const response = await axios.get<Display[]>(
        `${this.baseUrl}/master/Display`
      );
      return response.data;
    } catch (error) {
      throw this.handleError(error);
    }
  }

  async createDisplay(formData: DisplayFormData): Promise<ApiResponse> {
    try {
      const data = new FormData();
      Object.entries(formData).forEach(([key, value]) => {
        data.append(key, value);
      });

      const response = await axios.post<ApiResponse>(
        `${this.baseUrl}/master/Display`,
        data,
        {
          headers: {
            "Content-Type": "multipart/form-data",
          },
        }
      );
      
      return {
        status: response.status,
        message: response.data?.message,
        data: response.data?.data || response.data || {}
      };
    } catch (error) {
      throw this.handleError(error);
    }
  }

  async updateDisplay(formData: DisplayFormData): Promise<ApiResponse> {
    try {
      const data = new URLSearchParams();
      Object.entries(formData).forEach(([key, value]) => {
        data.append(key, value);
      });

      const response = await axios.put<ApiResponse>(
        `${this.baseUrl}/master/Display`,
        data,
        {
          headers: {
            "Content-Type": "multipart/form-data",
          },
        }
      );
      
      return {
        status: response.status,
        message: response.data?.message,
        data: response.data?.data || response.data || {}
      };
    } catch (error) {
      throw this.handleError(error);
    }
  }

  async fetchDisplayAndonByShortlink(shortlink: string): Promise<DisplayAndon[]> {
    try {
      const response = await axios.get<DisplayAndon[]>(
        `${this.baseUrl}/master/Display/andon`,
        {
          params: { shortlink },
        }
      );
      return response.data;
    } catch (error) {
      throw this.handleError(error);
    }
  }

  async fetchDisplayAndonById(id: string): Promise<DisplayAndon[]> {
    try {
      const response = await axios.get<DisplayAndon[]>(
        `${this.baseUrl}/master/Display/andon`,
        {
          params: { id },
        }
      );
      return response.data;
    } catch (error) {
      throw this.handleError(error);
    }
  }

  async deleteDisplayAndon(id: string): Promise<ApiResponse> {
    try {
      const data = new URLSearchParams();
      data.append("id", id);

      const response = await axios.delete<ApiResponse>(
        `${this.baseUrl}/master/Display/index_delete`,
        { data }
      );
      
      return {
        status: response.status,
        message: response.data?.message,
        data: response.data?.data || {}
      };
    } catch (error) {
      throw this.handleError(error);
    }
  }

  async createAndonGroup(
    formData: DisplayAndonFormData,
    displayId: string
  ): Promise<ApiResponse> {
    try {
      const data = new FormData();
      Object.entries(formData).forEach(([key, value]) => {
        data.append(key, value);
      });
      data.append("display_id", displayId);

      const response = await axios.post<ApiResponse>(
        `${this.baseUrl}/master/Display/Group`,
        data,
        {
          headers: {
            "Content-Type": "multipart/form-data",
          },
        }
      );
      
      return {
        status: response.status,
        message: response.data?.message,
        data: response.data?.data || response.data || {}
      };
    } catch (error) {
      throw this.handleError(error);
    }
  }

  async updateAndonGroup(
    formData: DisplayAndonFormData,
    displayId: string
  ): Promise<ApiResponse> {
    try {
      const data = new URLSearchParams();
      Object.entries(formData).forEach(([key, value]) => {
        data.append(key, value);
      });
      data.append("display_id", displayId);

      const response = await axios.put<ApiResponse>(
        `${this.baseUrl}/master/Display/Group`,
        data,
        {
          headers: {
            "Content-Type": "multipart/form-data",
          },
        }
      );
      
      return {
        status: response.status,
        message: response.data?.message,
        data: response.data?.data || response.data || {}
      };
    } catch (error) {
      throw this.handleError(error);
    }
  }

  async fetchListAndon(): Promise<DisplayAndon[]> {
    try {
      const response = await axios.get<DisplayAndon[]>(
        `${this.baseUrl}/andon/display/andon`
      );
      return response.data;
    } catch (error) {
      throw this.handleError(error);
    }
  }

  async moveAndon(
    urut: number,
    id: string,
    direction: MoveDirection,
    displayId: string
  ): Promise<ApiResponse> {
    try {
      const data = new URLSearchParams();
      data.append("urut", urut.toString());
      data.append("id", id);
      data.append("move", direction);
      data.append("display_id", displayId);

      const response = await axios.put<ApiResponse>(
        `${this.baseUrl}/master/Display/move`,
        data,
        {
          headers: {
            "Content-Type": "multipart/form-data",
          },
        }
      );
      return {
        status: response.status,
        message: response.data?.message,
        data: response.data?.data || response.data || {}
      };
    } catch (error) {
      throw this.handleError(error);
    }
  }

  private handleError(error: unknown): Error {
    if (axios.isAxiosError(error)) {
      const message = error.response?.data?.message || error.message;
      return new Error(message);
    }
    if (error instanceof Error) {
      return error;
    }
    return new Error("An unknown error occurred");
  }
}