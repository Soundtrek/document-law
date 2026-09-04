export interface LearningAssignmentInput {
  readonly accountId: string;
  readonly personId: string;
  readonly companyId: string;
  readonly relationshipId: string;
  readonly courseReference: string;
}

export interface LearningAssignmentResult {
  readonly provider: string;
  readonly providerAssignmentId: string;
  readonly status: "ASSIGNED" | "IN_PROGRESS" | "COMPLETED" | "FAILED";
}

export interface LearningCompletionResult {
  readonly provider: string;
  readonly providerAssignmentId: string;
  readonly status: "ASSIGNED" | "IN_PROGRESS" | "COMPLETED" | "FAILED";
  readonly completedAt?: string;
  readonly certificateReference?: string;
}

export interface LearningProvider {
  assign(input: LearningAssignmentInput): Promise<LearningAssignmentResult>;
  getCompletion(providerAssignmentId: string): Promise<LearningCompletionResult>;
}

export class UnconfiguredLearningProvider implements LearningProvider {
  async assign(_input: LearningAssignmentInput): Promise<LearningAssignmentResult> {
    throw new Error("Learning provider is not configured in Document Knowledge Engine V1");
  }

  async getCompletion(_providerAssignmentId: string): Promise<LearningCompletionResult> {
    throw new Error("Learning provider is not configured in Document Knowledge Engine V1");
  }
}
