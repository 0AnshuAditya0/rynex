import json
import math
import re
import sys
from collections import Counter, defaultdict
from pathlib import Path
from typing import Any, Dict, List, Tuple

CURRENT_FILE = Path(__file__).resolve()
BACKEND_DIR = CURRENT_FILE.parents[2]
if str(BACKEND_DIR) not in sys.path:
    sys.path.insert(0, str(BACKEND_DIR))

from app.models.mongo_schemas import PostDoc

try:
    from sklearn.feature_extraction.text import TfidfVectorizer
    from sklearn.metrics.pairwise import cosine_similarity
    SKLEARN_AVAILABLE = True
except ImportError:
    SKLEARN_AVAILABLE = False


def _tokenize(text: str) -> List[str]:
    words = re.findall(r"\b[a-zA-Z0-9_\-\[\]]+\b", text.lower())
    unigrams = [w for w in words if len(w) > 1]
    bigrams = [f"{words[i]}_{words[i+1]}" for i in range(len(words) - 1)]
    return unigrams + bigrams


def _pure_python_cosine_similarity(vec_a: Dict[str, float], vec_b: Dict[str, float]) -> float:
    if not vec_a or not vec_b:
        return 0.0

    common_keys = set(vec_a.keys()) & set(vec_b.keys())
    if not common_keys:
        return 0.0

    dot_product = sum(vec_a[k] * vec_b[k] for k in common_keys)
    norm_a = math.sqrt(sum(v * v for v in vec_a.values()))
    norm_b = math.sqrt(sum(v * v for v in vec_b.values()))

    if norm_a == 0.0 or norm_b == 0.0:
        return 0.0

    score = dot_product / (norm_a * norm_b)
    return max(0.0, min(1.0, float(score)))


def compare_personas(posts_a: List[str], posts_b: List[str]) -> float:
    text_a = " ".join(posts_a).strip()
    text_b = " ".join(posts_b).strip()

    if not text_a or not text_b:
        return 0.0

    if SKLEARN_AVAILABLE:
        vectorizer = TfidfVectorizer(
            ngram_range=(1, 2),
            token_pattern=r"(?u)\b[a-zA-Z0-9_\-\[\]]+\b",
            sublinear_tf=True,
        )
        try:
            tfidf_matrix = vectorizer.fit_transform([text_a, text_b])
            sim = float(cosine_similarity(tfidf_matrix[0:1], tfidf_matrix[1:2])[0][0])
            return max(0.0, min(1.0, round(sim, 4)))
        except ValueError:
            return 0.0

    tokens_a = _tokenize(text_a)
    tokens_b = _tokenize(text_b)

    if not tokens_a or not tokens_b:
        return 0.0

    counts_a = Counter(tokens_a)
    counts_b = Counter(tokens_b)

    all_vocab = set(counts_a.keys()) | set(counts_b.keys())
    vec_a = {}
    vec_b = {}

    for term in all_vocab:
        df = (1 if term in counts_a else 0) + (1 if term in counts_b else 0)
        idf = math.log((1.0 + 2.0) / (1.0 + df)) + 1.0

        if counts_a[term] > 0:
            tf_a = 1.0 + math.log(counts_a[term])
            vec_a[term] = tf_a * idf

        if counts_b[term] > 0:
            tf_b = 1.0 + math.log(counts_b[term])
            vec_b[term] = tf_b * idf

    return round(_pure_python_cosine_similarity(vec_a, vec_b), 4)


def rank_stylometric_candidates(
    target_actor_id: str,
    all_posts: Dict[str, List[str]],
) -> List[Dict[str, Any]]:
    if target_actor_id not in all_posts:
        return []

    target_posts = all_posts[target_actor_id]
    target_text = " ".join(target_posts).strip()
    if not target_text:
        return []

    candidate_ids = [aid for aid in all_posts.keys() if aid != target_actor_id]
    if not candidate_ids:
        return []

    if SKLEARN_AVAILABLE:
        corpus = [target_text] + [" ".join(all_posts[aid]).strip() for aid in candidate_ids]
        vectorizer = TfidfVectorizer(
            ngram_range=(1, 2),
            token_pattern=r"(?u)\b[a-zA-Z0-9_\-\[\]]+\b",
            sublinear_tf=True,
            min_df=1,
        )
        try:
            tfidf_matrix = vectorizer.fit_transform(corpus)
            target_vector = tfidf_matrix[0:1]
            candidates_matrix = tfidf_matrix[1:]
            similarities = cosine_similarity(target_vector, candidates_matrix)[0]

            results = []
            for aid, sim in zip(candidate_ids, similarities):
                results.append(
                    {
                        "actor_id": aid,
                        "similarity": max(0.0, min(1.0, round(float(sim), 4))),
                    }
                )
            results.sort(key=lambda x: x["similarity"], reverse=True)
            return results
        except ValueError:
            pass

    corpus_docs = {aid: _tokenize(" ".join(all_posts[aid]).strip()) for aid in all_posts}
    target_tokens = corpus_docs[target_actor_id]
    if not target_tokens:
        return []

    total_docs = len(corpus_docs)
    df_counts = defaultdict(int)
    for aid, tlist in corpus_docs.items():
        unique_tokens = set(tlist)
        for t in unique_tokens:
            df_counts[t] += 1

    idf_table = {
        term: math.log((1.0 + total_docs) / (1.0 + df)) + 1.0
        for term, df in df_counts.items()
    }

    def compute_doc_vector(tokens: List[str]) -> Dict[str, float]:
        counts = Counter(tokens)
        vec = {}
        for t, count in counts.items():
            tf = 1.0 + math.log(count)
            vec[t] = tf * idf_table.get(t, 1.0)
        return vec

    target_vec = compute_doc_vector(target_tokens)

    results = []
    for aid in candidate_ids:
        cand_tokens = corpus_docs[aid]
        if not cand_tokens:
            sim = 0.0
        else:
            cand_vec = compute_doc_vector(cand_tokens)
            sim = _pure_python_cosine_similarity(target_vec, cand_vec)
        results.append(
            {
                "actor_id": aid,
                "similarity": round(sim, 4),
            }
        )

    results.sort(key=lambda x: x["similarity"], reverse=True)
    return results


def calibrate_stylometric_confidence(
    target_actor_id: str,
    candidate_actor_id: str,
    all_posts: Dict[str, List[str]],
) -> Dict[str, Any]:
    target_posts = all_posts.get(target_actor_id, [])
    candidate_posts = all_posts.get(candidate_actor_id, [])

    if not target_posts or not candidate_posts:
        return {
            "raw_score": 0.0,
            "background_mean": 0.0,
            "background_std": 0.0,
            "percentile": 0.5,
            "n_background": 0,
            "insufficient_background": True,
        }

    raw_score = compare_personas(target_posts, candidate_posts)

    background_actors = [
        aid for aid in all_posts.keys()
        if aid != target_actor_id and aid != candidate_actor_id
    ]

    background_scores = []
    for aid in background_actors:
        other_posts = all_posts.get(aid, [])
        if other_posts:
            sim = compare_personas(target_posts, other_posts)
            background_scores.append(sim)

    n_bg = len(background_scores)
    if n_bg < 2:
        return {
            "raw_score": round(raw_score, 4),
            "background_mean": round(background_scores[0], 4) if n_bg == 1 else 0.0,
            "background_std": 0.0,
            "percentile": 0.5,
            "n_background": n_bg,
            "insufficient_background": True,
        }

    bg_mean = sum(background_scores) / n_bg
    variance = sum((s - bg_mean) ** 2 for s in background_scores) / (n_bg - 1)
    bg_std = math.sqrt(max(0.0, variance))

    if bg_std < 1e-6:
        return {
            "raw_score": round(raw_score, 4),
            "background_mean": round(bg_mean, 4),
            "background_std": round(bg_std, 4),
            "percentile": 0.5,
            "n_background": n_bg,
            "insufficient_background": True,
        }

    count_below = sum(1 for s in background_scores if s < raw_score)
    count_equal = sum(1 for s in background_scores if abs(s - raw_score) < 1e-7)
    percentile = (count_below + 0.5 * count_equal) / n_bg
    clamped_percentile = max(0.0, min(1.0, percentile))

    return {
        "raw_score": round(raw_score, 4),
        "background_mean": round(bg_mean, 4),
        "background_std": round(bg_std, 4),
        "percentile": round(clamped_percentile, 4),
        "n_background": n_bg,
        "insufficient_background": False,
    }


if __name__ == "__main__":
    posts_path = BACKEND_DIR / "seed_data" / "posts.json"
    with open(posts_path, "r", encoding="utf-8-sig") as f:
        raw_posts = json.load(f)

    post_docs = [PostDoc(**p) for p in raw_posts]
    all_posts_by_actor = defaultdict(list)
    for p in post_docs:
        all_posts_by_actor[p.actor_id].append(p.raw_text)

    rebrand_pairs = [
        ("actor-rebrand-01-old", "actor-rebrand-01-new", "Rebrand Pair 1 (Drugs)"),
        ("actor-rebrand-02-old", "actor-rebrand-02-new", "Rebrand Pair 2 (Hacking-Services)"),
        ("actor-rebrand-03-old", "actor-rebrand-03-new", "Rebrand Pair 3 (Stolen-Data)"),
    ]

    random_pairs = [
        ("actor-rebrand-01-old", "actor-arms-001", "Random Pair 1 (Drugs vs Arms)"),
        ("actor-rebrand-02-old", "actor-drugs-005", "Random Pair 2 (Hacking vs Drugs)"),
        ("actor-rebrand-03-old", "actor-money-laundering-004", "Random Pair 3 (Data vs Laundering)"),
    ]

    print("=" * 70)
    print("STYLOMETRY ENGINE SELF-TEST (TF-IDF Cosine Similarity)")
    print(f"Backend Engine: {'scikit-learn' if SKLEARN_AVAILABLE else 'pure-python'}")
    print("=" * 70)

    print("\n--- GROUND-TRUTH REBRAND PAIRS ---")
    for old_id, new_id, label in rebrand_pairs:
        posts_old = all_posts_by_actor.get(old_id, [])
        posts_new = all_posts_by_actor.get(new_id, [])
        pairwise_sim = compare_personas(posts_old, posts_new)
        print(f"[{label}]")
        print(f"  Old Actor   : {old_id} ({len(posts_old)} posts)")
        print(f"  New Actor   : {new_id} ({len(posts_new)} posts)")
        print(f"  Similarity  : {pairwise_sim:.4f}")

    print("\n--- RANDOM / BASELINE ACTOR PAIRS ---")
    for a_id, b_id, label in random_pairs:
        p_a = all_posts_by_actor.get(a_id, [])
        p_b = all_posts_by_actor.get(b_id, [])
        rand_sim = compare_personas(p_a, p_b)
        print(f"[{label}]")
        print(f"  Actor A     : {a_id}")
        print(f"  Actor B     : {b_id}")
        print(f"  Similarity  : {rand_sim:.4f}")

    print("\n--- CANDIDATE RANKING TEST FOR REBRAND TARGETS ---")
    for old_id, new_id, label in rebrand_pairs:
        ranking = rank_stylometric_candidates(old_id, all_posts_by_actor)
        top_match = ranking[0] if ranking else None
        target_rank = None
        for rank_idx, candidate in enumerate(ranking, 1):
            if candidate["actor_id"] == new_id:
                target_rank = rank_idx
                break
        print(f"Target: {old_id} -> Expected rebrand: {new_id}")
        print(f"  Top Candidate: {top_match['actor_id']} (Score: {top_match['similarity']:.4f})")
        print(f"  Expected Rebrand Rank: #{target_rank} out of {len(ranking)} candidates")

    print("\n--- CALIBRATED STYLOMETRIC CONFIDENCE FOR REBRAND PAIRS ---")
    for old_id, new_id, label in rebrand_pairs:
        calib = calibrate_stylometric_confidence(old_id, new_id, all_posts_by_actor)
        print(f"[{label}]")
        print(f"  Target: {old_id} <-> Candidate: {new_id}")
        print(f"  Raw Score        : {calib['raw_score']:.4f}")
        print(f"  Background Mean  : {calib['background_mean']:.4f}")
        print(f"  Background Std   : {calib['background_std']:.4f}")
        print(f"  Null Dist Size   : {calib['n_background']} actors")
        print(f"  Calibrated Pctl  : {calib['percentile']:.4f} ({calib['percentile']*100:.1f}th percentile)")
    print("=" * 70)
