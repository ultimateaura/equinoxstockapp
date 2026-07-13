/**
 * linearAlgebra.ts - Minimal matrix math for PCA and related portfolio analysis.
 *
 * Pure TypeScript, no native deps. Used by pca.ts for eigen-decomposition via
 * power iteration / deflation on correlation matrices.
 */

/** Dot product of two equal-length vectors. */
export function dot(a: number[], b: number[]): number {
  let s = 0;
  for (let i = 0; i < a.length; i++) s += a[i] * b[i];
  return s;
}

/** Euclidean (L2) norm. */
export function norm(v: number[]): number {
  return Math.sqrt(dot(v, v));
}

/** Scale a vector by a scalar. */
export function scale(v: number[], c: number): number[] {
  return v.map((x) => x * c);
}

/** a - b element-wise. */
export function subtract(a: number[], b: number[]): number[] {
  return a.map((x, i) => x - b[i]);
}

/** Matrix-vector product: A * v. A is row-major square/rectangular. */
export function matVec(A: number[][], v: number[]): number[] {
  return A.map((row) => dot(row, v));
}

/** Create an n×n identity matrix. */
export function identity(n: number): number[][] {
  return Array.from({ length: n }, (_, i) =>
    Array.from({ length: n }, (_, j) => (i === j ? 1 : 0))
  );
}

/** Outer product u * v^T as an n×n matrix (u and v same length). */
export function outer(u: number[], v: number[]): number[][] {
  const n = u.length;
  const out: number[][] = Array.from({ length: n }, () => Array(n).fill(0));
  for (let i = 0; i < n; i++) {
    for (let j = 0; j < n; j++) {
      out[i][j] = u[i] * v[j];
    }
  }
  return out;
}

/** A - B element-wise (same shape). */
export function matSub(A: number[][], B: number[][]): number[][] {
  return A.map((row, i) => row.map((x, j) => x - B[i][j]));
}

/** Scalar * matrix. */
export function matScale(A: number[][], c: number): number[][] {
  return A.map((row) => row.map((x) => x * c));
}

/**
 * Power iteration: find the dominant eigenvector of a symmetric matrix A.
 * Returns { eigenvalue, eigenvector } with ||eigenvector|| = 1.
 */
export function powerIteration(
  A: number[][],
  maxIter = 100,
  tol = 1e-10
): { eigenvalue: number; eigenvector: number[] } {
  const n = A.length;
  if (n === 0) return { eigenvalue: 0, eigenvector: [] };

  // Start from a random-ish but deterministic vector for test stability.
  let v = Array.from({ length: n }, (_, i) => 1 / Math.sqrt(n) + (i % 2 === 0 ? 0.01 : -0.01));
  let nrm = norm(v);
  if (nrm === 0) v = Array(n).fill(1 / Math.sqrt(n));
  else v = scale(v, 1 / nrm);

  let eigenvalue = 0;
  for (let iter = 0; iter < maxIter; iter++) {
    const Av = matVec(A, v);
    const nextNorm = norm(Av);
    if (nextNorm === 0) break;
    const next = scale(Av, 1 / nextNorm);
    eigenvalue = nextNorm; // Rayleigh for unit eigenvector ≈ ||Av|| if converged
    // More accurate Rayleigh quotient: v^T A v
    eigenvalue = dot(v, Av);
    if (norm(subtract(next, v)) < tol) {
      v = next;
      break;
    }
    v = next;
  }

  // Final Rayleigh quotient
  const Av = matVec(A, v);
  eigenvalue = dot(v, Av);
  return { eigenvalue, eigenvector: v };
}

/**
 * Deflate A by removing one eigencomponent: A' = A - λ v v^T.
 * Used to extract successive principal components.
 */
export function deflate(A: number[][], eigenvalue: number, eigenvector: number[]): number[][] {
  return matSub(A, matScale(outer(eigenvector, eigenvector), eigenvalue));
}

/**
 * Extract the top-k eigenpairs of a symmetric matrix via power iteration + deflation.
 * Eigenvalues are sorted descending by absolute value (PCA wants largest variance).
 */
export function topEigenpairs(
  A: number[][],
  k: number
): { eigenvalues: number[]; eigenvectors: number[][] } {
  const n = A.length;
  const num = Math.min(k, n);
  let remaining = A.map((row) => [...row]);
  const eigenvalues: number[] = [];
  const eigenvectors: number[][] = [];

  for (let i = 0; i < num; i++) {
    const { eigenvalue, eigenvector } = powerIteration(remaining);
    if (!isFinite(eigenvalue) || Math.abs(eigenvalue) < 1e-12) break;
    eigenvalues.push(eigenvalue);
    eigenvectors.push(eigenvector);
    remaining = deflate(remaining, eigenvalue, eigenvector);
  }

  return { eigenvalues, eigenvectors };
}

/** Trace of a square matrix (sum of diagonal). */
export function trace(A: number[][]): number {
  let s = 0;
  for (let i = 0; i < A.length; i++) s += A[i][i];
  return s;
}
