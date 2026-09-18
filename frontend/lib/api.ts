import axios from "axios";

export type IdentifierType = "handle" | "pgp" | "wallet";
export type ActorStatus = "active" | "rebranded" | "inactive";
export type ExportFormat = "csv" | "json";

export interface ConfidenceBreakdown {
  identifier_match: number;
  infra_match: number;
  stylometric_sim: number;
  behavioural: number;
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
  label: IdentifierType | "SAME_AS";
  score: number;
}

export interface GraphResponse {
  nodes: Array<{ data: GraphNodeData }>;
  edges: Array<{ data: GraphEdgeData }>;
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
  ): Promise<ExportRecord[] | string> =>
    (
      await apiClient.get<ExportRecord[] | string>("/export", {
        params: { format, category },
        responseType: format === "csv" ? "text" : "json",
      })
    ).data,
};

export default apiClient;
