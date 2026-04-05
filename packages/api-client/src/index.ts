import axios, { type AxiosInstance } from 'axios';
import type {
  AuthSyncRequest,
  AuthSyncResponse,
  CreateVendorRequest,
  CreateVendorResponse,
  VendorPublicResponse,
  NearbyVendorsResponse,
  VendorMeResponse,
  AddRegisterResponse,
  QRGenerateRequest,
  QRGenerateResponse,
  QRClaimRequest,
  ClaimResponse,
  NFCClaimRequest,
  TransactionHistoryResponse,
  VendorRecentResponse,
  PointBalanceResponse,
  PointLedgerResponse,
  RedemptionOptionsResponse,
  IssueRedemptionRequest,
  IssueRedemptionResponse,
  ValidateRedemptionRequest,
  ValidateRedemptionResponse,
  ConfirmRedemptionResponse,
} from '@pgh-pass/types';

export function createApiClient(
  baseUrl: string,
  getToken: () => Promise<string | null>,
) {
  const http: AxiosInstance = axios.create({ baseURL: baseUrl });

  http.interceptors.request.use(async (config) => {
    const token = await getToken();
    if (token) {
      config.headers.Authorization = `Bearer ${token}`;
    }
    return config;
  });

  return {
    // Auth
    async syncUser(data: AuthSyncRequest): Promise<AuthSyncResponse> {
      const res = await http.post<AuthSyncResponse>('/v1/auth/sync', data);
      return res.data;
    },

    // Vendors
    async createVendor(data: CreateVendorRequest): Promise<CreateVendorResponse> {
      const res = await http.post<CreateVendorResponse>('/v1/vendors', data);
      return res.data;
    },

    async getVendor(slug: string): Promise<VendorPublicResponse> {
      const res = await http.get<VendorPublicResponse>(`/v1/vendors/${slug}`);
      return res.data;
    },

    async getNearbyVendors(params: {
      lat: number;
      lng: number;
      radius_km?: number;
      limit?: number;
      offset?: number;
    }): Promise<NearbyVendorsResponse> {
      const res = await http.get<NearbyVendorsResponse>('/v1/vendors/nearby', { params });
      return res.data;
    },

    async getMyVendor(): Promise<VendorMeResponse> {
      const res = await http.get<VendorMeResponse>('/v1/vendors/me');
      return res.data;
    },

    async addRegister(vendorId: string, label: string): Promise<AddRegisterResponse> {
      const res = await http.post<AddRegisterResponse>(
        `/v1/vendors/${vendorId}/registers`,
        { label },
      );
      return res.data;
    },

    // Transactions
    async generateQR(data: QRGenerateRequest): Promise<QRGenerateResponse> {
      const res = await http.post<QRGenerateResponse>('/v1/transactions/qr/generate', data);
      return res.data;
    },

    async claimQR(data: QRClaimRequest): Promise<ClaimResponse> {
      const res = await http.post<ClaimResponse>('/v1/transactions/qr/claim', data);
      return res.data;
    },

    async claimNFC(data: NFCClaimRequest): Promise<ClaimResponse> {
      const res = await http.post<ClaimResponse>('/v1/transactions/nfc/claim', data);
      return res.data;
    },

    async getTransactionHistory(params?: {
      limit?: number;
      offset?: number;
    }): Promise<TransactionHistoryResponse> {
      const res = await http.get<TransactionHistoryResponse>('/v1/transactions/history', {
        params,
      });
      return res.data;
    },

    async getVendorRecent(params?: { limit?: number }): Promise<VendorRecentResponse> {
      const res = await http.get<VendorRecentResponse>('/v1/transactions/vendor/recent', {
        params,
      });
      return res.data;
    },

    // Points
    async getPointBalance(): Promise<PointBalanceResponse> {
      const res = await http.get<PointBalanceResponse>('/v1/points/balance');
      return res.data;
    },

    async getPointLedger(params?: {
      limit?: number;
      offset?: number;
    }): Promise<PointLedgerResponse> {
      const res = await http.get<PointLedgerResponse>('/v1/points/ledger', { params });
      return res.data;
    },

    // Redemptions
    async getRedemptionOptions(): Promise<RedemptionOptionsResponse> {
      const res = await http.get<RedemptionOptionsResponse>('/v1/redemptions/options');
      return res.data;
    },

    async issueRedemption(data: IssueRedemptionRequest): Promise<IssueRedemptionResponse> {
      const res = await http.post<IssueRedemptionResponse>('/v1/redemptions', data);
      return res.data;
    },

    async validateRedemption(data: ValidateRedemptionRequest): Promise<ValidateRedemptionResponse> {
      const res = await http.post<ValidateRedemptionResponse>('/v1/redemptions/validate', data);
      return res.data;
    },

    async confirmRedemption(redemptionId: string): Promise<ConfirmRedemptionResponse> {
      const res = await http.post<ConfirmRedemptionResponse>(
        `/v1/redemptions/${redemptionId}/confirm`,
      );
      return res.data;
    },
  };
}

export type ApiClient = ReturnType<typeof createApiClient>;
