import axios from "axios";

export type IdentifierType = "handle" | "pgp" | "wallet";
export type ActorStatus = "active" | "rebranded" | "inactive";
export type ExportFormat = "csv" | "json" | "pdf" | "html";

export interface ConfidenceComponentBreakdown {
  raw: number;
  weight: number;
  contribution: number;
  display_note?: string;
}

export interface ConfidenceBreakdown {
  identifier_match: ConfidenceComponentBreakdown;
  infra_match: ConfidenceComponentBreakdown;
  stylometric_sim: ConfidenceComponentBreakdown;
  behavioural: ConfidenceComponentBreakdown;
}

export interface Identifier {
  type: IdentifierType;
  value: string;
  platform: string | null;
  currency: string | null;
  first_seen: string;
}

export interface LinkedActor {
  actor_id: string;
  primary_handle: string;
  category: string;
  status: ActorStatus;
  shared_type: IdentifierType;
  shared_value: string;
  identifier_match_score: number;
}

export interface EntityLink {
  actor_a: string;
  actor_b: string;
  shared_type: IdentifierType;
  shared_value: string;
  identifier_match_score: number;
}

export interface StylometryResult {
  raw_score: number;
  background_mean: number;
  background_std: number;
  percentile: number;
  n_background: number;
  insufficient_background: boolean;
}

export interface Post {
  id: string;
  actor_id: string;
  platform: string;
  raw_text: string;
  timestamp: string;
  source: string;
}

export interface DescriptorFlag {
  onion_address: string;
  flagged: boolean;
  reasons: string[];
  confidence_contribution: number;
}

export interface InfraMatch {
  onion_address: string;
  signal_type: string;
  matched_indicator: string;
  confidence_contribution: number;
}

export interface InfraCorrelation {
  onion_address: string;
  cert_banner_matches: InfraMatch[];
  descriptor_flag: DescriptorFlag | null;
  combined_infra_score: number;
}

export interface ActorSummary {
  id: string;
  primary_handle: string;
  category: string;
  status: ActorStatus;
  identifiers: Identifier[];
  hidden_services: string[];
  linked_actor_ids: string[];
  source: string;
  first_seen: string;
  last_seen: string;
  notes: string | null;
  confidence: number;
  confidence_breakdown: ConfidenceBreakdown;
  matched_actor_id: string | null;
}

export interface Actor extends ActorSummary {
  entity_link: EntityLink | null;
  stylometry: StylometryResult | null;
  linked_actors: LinkedActor[];
  posts: Post[];
  infra_correlation: InfraCorrelation[];
}

export interface ActorsResponse {
  total: number;
  limit: number;
  offset: number;
  items: ActorSummary[];
}

export interface SearchResult {
  id: string;
  primary_handle: string;
  category: string;
  status: ActorStatus;
  matched_fields: IdentifierType[];
  confidence: number;
  confidence_breakdown: ConfidenceBreakdown;
}

export interface SearchResponse {
  query: string;
  total: number;
  results: SearchResult[];
}

export interface GraphNodeData {
  id: string;
  label: string;
  type: "actor" | IdentifierType;
}

export interface GraphEdgeData {
  id?: string;
  source: string;
  target: string;
  label: IdentifierType | "SAME_AS" | "TRUSTS";
  score: number;
  trust_type?: "shared_infra" | "shared_platform";
  evidence?: string;
}

export interface GraphResponse {
  nodes: Array<{ data: GraphNodeData }>;
  edges: Array<{ data: GraphEdgeData }>;
  trust_total?: number;
  trust_shown?: number;
  trust_hidden?: number;
}

export interface ExtractedIdentifier {
  type: "pgp" | "wallet";
  value: string;
  status: "unconfirmed_extraction";
  source_post_id: string;
}

export interface PostExtractionResponse {
  post_id: string;
  extracted_identifiers: ExtractedIdentifier[];
}

export interface HealthResponse {
  status: "ok";
  actors_loaded: number;
}

export interface CalibrationPair {
  old_id: string;
  new_id: string;
  raw_stylometric_score: number;
  rank_of_true_match: number | null;
  n_candidates: number;
}

export interface CalibrationResponse {
  method: string;
  n_actors_scored: number;
  n_ground_truth_pairs: number;
  pairs: CalibrationPair[];
  summary: {
    top1_accuracy: number;
    top5_accuracy: number;
    mrr: number;
    roc_auc_stylometry_only: number;
    n_positive_scores: number;
    n_negative_scores: number;
  };
  pr_curve: Array<{ threshold: number; precision: number; recall: number }>;
  roc_curve: Array<{ threshold: number; fpr: number; tpr: number }>;
}

export interface ScanStatus {
  simulated: boolean;
  label: string;
  tick: number;
  last_scan: string | null;
  recent_events: Array<{
    tick: number;
    actor_id: string;
    primary_handle: string;
    post_id: string;
    timestamp: string;
  }>;
  note: string;
}

export interface ScanTick extends ScanStatus {
  actor_id?: string;
  primary_handle?: string;
  post_id?: string;
  timestamp?: string;
}

export interface WatchlistItem {
  id: string;
  primary_handle: string;
  category: string;
  status: ActorStatus;
  confidence: number;
  matched_actor_id: string | null;
}

export interface WatchlistResponse {
  min_confidence: number;
  total: number;
  items: WatchlistItem[];
}

export interface InfraSummary {
  total_actors: number;
  actors_with_hidden_services: number;
  actors_with_matches: number;
  signal_counts: Record<string, number>;
  cert_fingerprint_matches: number;
  favicon_hash_matches: number;
  banner_hash_matches: number;
  descriptor_flagged_count: number;
}

export interface SampleArtifact {
  label: string;
  note: string;
  source_file: string;
  parsed: {
    sha256_fingerprint: string;
    subject_cn: string | null;
    issuer_cn: string | null;
    self_signed: boolean;
    sans: string[];
    not_before: string;
    not_after: string;
    signature_hash_algorithm: string | null;
    public_key_algorithm: string;
    public_key_size: number | null;
    serial_number: string;
  };
}

export interface ExportRecord {
  id: string;
  primary_handle: string;
  category: string;
  status: ActorStatus;
  confidence: number;
  identifier_match: number;
  infra_match: number;
  stylometric_sim: number;
  behavioural: number;
  matched_actor_id: string | null;
}

export interface ListActorsParams {
  category?: string;
  status?: ActorStatus;
  first_seen_after?: string;
  first_seen_before?: string;
  limit?: number;
  offset?: number;
}

const apiClient = axios.create({
  baseURL: process.env.NEXT_PUBLIC_API_URL ?? "http://localhost:8000",
});

export const api = {
  health: async (): Promise<HealthResponse> =>
    (await apiClient.get<HealthResponse>("/health")).data,

  listActors: async (params: ListActorsParams = {}): Promise<ActorsResponse> =>
    (await apiClient.get<ActorsResponse>("/actors", { params })).data,

  getActor: async (actorId: string): Promise<Actor> =>
    (await apiClient.get<Actor>(`/actors/${encodeURIComponent(actorId)}`)).data,

  search: async (q: string): Promise<SearchResponse> =>
    (await apiClient.get<SearchResponse>("/search", { params: { q } })).data,

  getGraph: async (actorId: string): Promise<GraphResponse> =>
    (await apiClient.get<GraphResponse>(`/graph/${encodeURIComponent(actorId)}`)).data,

  getInfra: async (onionAddress: string): Promise<InfraCorrelation> =>
    (await apiClient.get<InfraCorrelation>(`/infra/${encodeURIComponent(onionAddress)}`)).data,

  extractPost: async (postId: string): Promise<PostExtractionResponse> =>
    (await apiClient.get<PostExtractionResponse>(`/posts/${encodeURIComponent(postId)}/extract`)).data,

  exportActors: async (
    format: ExportFormat,
    category?: string,
  ): Promise<ExportRecord[] | string | Blob> => {
    if (format === "pdf") {
      const res = await apiClient.get("/export", {
        params: { format, category },
        responseType: "blob",
      });
      return res.data as Blob;
    }
    return (
      await apiClient.get<ExportRecord[] | string>("/export", {
        params: { format, category },
        responseType: format === "csv" ? "text" : "json",
      })
    ).data;
  },

  exportActorCase: async (actorId: string, format: "pdf" | "html" = "pdf"): Promise<Blob | string> => {
    const res = await apiClient.get(`/export/actor/${encodeURIComponent(actorId)}`, {
      params: { format },
      responseType: format === "pdf" ? "blob" : "text",
    });
    return res.data as Blob | string;
  },

  getCalibration: async (): Promise<CalibrationResponse> =>
    (await apiClient.get<CalibrationResponse>("/metrics/calibration")).data,

  getScanStatus: async (): Promise<ScanStatus> =>
    (await apiClient.get<ScanStatus>("/scan/status")).data,

  triggerScan: async (): Promise<ScanTick> =>
    (await apiClient.post<ScanTick>("/scan/trigger")).data,

  getWatchlist: async (minConfidence = 0.7): Promise<WatchlistResponse> =>
    (await apiClient.get<WatchlistResponse>("/watchlist", { params: { min_confidence: minConfidence } })).data,

  getSampleArtifact: async (): Promise<SampleArtifact> =>
    (await apiClient.get<SampleArtifact>("/infra/sample-artifact")).data,

  getInfraSummary: async (): Promise<InfraSummary> =>
    (await apiClient.get<InfraSummary>("/metrics/infra-summary")).data,
};

export default apiClient;
