import { describe, expect, it } from "vitest";
import {
  accelerationTemplate,
  accumulatedFatigueTemplate,
  bestTrainingBlockTemplate,
  excellentConsistencyTemplate,
  excessLoadTemplate,
  insufficientRecoveryTemplate,
  newPersonalBestTemplate,
  newShoePersonalBestTemplate,
  periodComparisonDeclinedTemplate,
  periodComparisonImprovedTemplate,
  performanceDifferenceBetweenShoesTemplate,
  planAdherenceStrongTemplate,
  planAdherenceWeakTemplate,
  plateauTemplate,
  recoveryAboveExpectedTemplate,
  recoveryBelowExpectedTemplate,
  reducedConsistencyTemplate,
  regressionTemplate,
  regularTrainingPatternTemplate,
  shoeApproachingReplacementTemplate,
  shoeReplacementRecommendedTemplate,
  trainingInterruptionTemplate,
  trendDecliningTemplate,
  trendImprovingTemplate,
  trendStableTemplate,
  volumeIrregularTemplate,
  volumeStableTemplate,
} from "../../insights/insightTemplates";

// Every template is a pure function of its parameters -- assert both the
// title and that description text actually incorporates the given values,
// so a future refactor can't silently drop a parameter from the prose.

describe("trend templates", () => {
  it("trendImprovingTemplate", () => {
    const t = trendImprovingTemplate("Fitness", 2.5, 20);
    expect(t.title).toBe("Fitness Improving");
    expect(t.description).toContain("+2.50");
    expect(t.description).toContain("20 data points");
  });

  it("trendDecliningTemplate", () => {
    const t = trendDecliningTemplate("Fitness", -1.2, 20);
    expect(t.title).toBe("Fitness Declining");
    expect(t.description).toContain("-1.20");
  });

  it("trendStableTemplate", () => {
    const t = trendStableTemplate("Fitness", 20);
    expect(t.title).toBe("Fitness Stable");
    expect(t.description).toContain("stable");
  });
});

describe("plateau / regression / acceleration templates", () => {
  it("plateauTemplate", () => {
    const t = plateauTemplate("Fitness", 6, 55.25);
    expect(t.title).toBe("Fitness Plateau");
    expect(t.description).toContain("55.25");
    expect(t.description).toContain("6 data points");
  });

  it("regressionTemplate", () => {
    const t = regressionTemplate("Fitness", 6, -3.1);
    expect(t.title).toBe("Fitness Declining");
    expect(t.description).toContain("-3.10");
  });

  it("accelerationTemplate", () => {
    const t = accelerationTemplate("Fitness", 6, 4.0, 2.0);
    expect(t.title).toBe("Fitness Accelerating");
    expect(t.description).toContain("4.00");
    expect(t.description).toContain("2.00");
  });
});

describe("consistency templates", () => {
  it("excellentConsistencyTemplate", () => {
    const t = excellentConsistencyTemplate(9, 10);
    expect(t.title).toBe("Excellent Training Consistency");
    expect(t.description).toContain("9 of the last 10 weeks");
  });

  it("reducedConsistencyTemplate", () => {
    const t = reducedConsistencyTemplate(4, 10);
    expect(t.title).toBe("Reduced Consistency");
    expect(t.description).toContain("4 of the last 10 weeks");
  });

  it("planAdherenceStrongTemplate", () => {
    const t = planAdherenceStrongTemplate(0.9, 8);
    expect(t.title).toBe("Plan Adherence Strong");
    expect(t.description).toContain("90%");
  });

  it("planAdherenceWeakTemplate", () => {
    const t = planAdherenceWeakTemplate(0.4, 8);
    expect(t.title).toBe("Plan Adherence Weak");
    expect(t.description).toContain("40%");
  });

  it("volumeStableTemplate", () => {
    const t = volumeStableTemplate(0.1, 8);
    expect(t.title).toBe("Training Volume Stable");
    expect(t.description).toContain("10%");
  });

  it("volumeIrregularTemplate", () => {
    const t = volumeIrregularTemplate(0.5, 8);
    expect(t.title).toBe("Training Volume Irregular");
    expect(t.description).toContain("50%");
  });

  it("regularTrainingPatternTemplate", () => {
    const t = regularTrainingPatternTemplate(8);
    expect(t.title).toBe("Regular Training Pattern");
    expect(t.description).toContain("8 weeks");
  });

  it("trainingInterruptionTemplate", () => {
    const t = trainingInterruptionTemplate(3);
    expect(t.title).toBe("Training Interruption Detected");
    expect(t.description).toContain("3 consecutive weeks");
  });
});

describe("fatigue templates", () => {
  it("accumulatedFatigueTemplate", () => {
    const t = accumulatedFatigueTemplate(-25.4, 6);
    expect(t.title).toBe("Accumulated Fatigue");
    expect(t.description).toContain("-25.4");
    expect(t.description).toContain("6 consecutive days");
  });

  it("insufficientRecoveryTemplate", () => {
    const t = insufficientRecoveryTemplate(-10.2, 10);
    expect(t.title).toBe("Insufficient Recovery Time");
    expect(t.description).toContain("-10.2");
    expect(t.description).toContain("10 days");
  });

  it("excessLoadTemplate formats a positive percentage with a leading +", () => {
    const t = excessLoadTemplate(35.4);
    expect(t.title).toBe("Excessive Training Load Increase");
    expect(t.description).toContain("+35.4%");
  });

  it("excessLoadTemplate does not add a + sign for a non-positive percentage", () => {
    const t = excessLoadTemplate(-5);
    expect(t.description).toContain("-5.0%");
    expect(t.description).not.toContain("+-5.0%");
  });
});

describe("recovery templates", () => {
  it("recoveryAboveExpectedTemplate", () => {
    const t = recoveryAboveExpectedTemplate(3.0, 1.0);
    expect(t.title).toBe("Recovery Above Expected");
    expect(t.description).toContain("3.00");
    expect(t.description).toContain("1.00");
  });

  it("recoveryBelowExpectedTemplate", () => {
    const t = recoveryBelowExpectedTemplate(-1.0, 2.0);
    expect(t.title).toBe("Recovery Below Expected");
    expect(t.description).toContain("-1.00");
    expect(t.description).toContain("2.00");
  });
});

describe("performance templates", () => {
  it("newPersonalBestTemplate mentions the prior best when one exists", () => {
    const t = newPersonalBestTemplate("5k", 1150, 1200);
    expect(t.title).toBe("New Personal Best");
    expect(t.description).toContain("1150s");
    expect(t.description).toContain("previous best of 1200s");
  });

  it("newPersonalBestTemplate calls out a first-ever effort when there's no prior best", () => {
    const t = newPersonalBestTemplate("15k", 3600, null);
    expect(t.description).toContain("first recorded effort");
  });
});

describe("training block templates", () => {
  it("bestTrainingBlockTemplate", () => {
    const t = bestTrainingBlockTemplate("Base Block", "CTL", 8.5);
    expect(t.title).toBe("Best Training Block");
    expect(t.description).toContain("Base Block");
    expect(t.description).toContain("+8.5%");
  });

  it("periodComparisonImprovedTemplate", () => {
    const t = periodComparisonImprovedTemplate("CTL", "Block A", "Block B", 50, 60);
    expect(t.title).toBe("CTL Improved");
    expect(t.description).toContain("Block A");
    expect(t.description).toContain("Block B");
    expect(t.description).toContain("+20.0%");
  });

  it("periodComparisonImprovedTemplate handles a zero baseline mean without dividing by zero", () => {
    const t = periodComparisonImprovedTemplate("CTL", "Block A", "Block B", 0, 10);
    expect(t.description).toContain("+0.0%");
  });

  it("periodComparisonDeclinedTemplate", () => {
    const t = periodComparisonDeclinedTemplate("CTL", "Block A", "Block B", 60, 50);
    expect(t.title).toBe("CTL Declined");
    expect(t.description).toContain("-16.7%");
  });
});

describe("shoe / equipment templates", () => {
  it("shoeReplacementRecommendedTemplate", () => {
    const t = shoeReplacementRecommendedTemplate("Pegasus 40", 720, 700);
    expect(t.title).toBe("Shoe Replacement Recommended");
    expect(t.description).toContain("Pegasus 40");
    expect(t.description).toContain("720km");
    expect(t.description).toContain("700km");
  });

  it("shoeApproachingReplacementTemplate", () => {
    const t = shoeApproachingReplacementTemplate("Pegasus 40", 610, 700);
    expect(t.title).toBe("Shoe Approaching Replacement");
    expect(t.description).toContain("610km");
  });

  it("performanceDifferenceBetweenShoesTemplate", () => {
    const t = performanceDifferenceBetweenShoesTemplate("Pegasus 40", "Vaporfly", "Average Pace", 5.2);
    expect(t.title).toBe("Performance Difference Between Shoes");
    expect(t.description).toContain("Pegasus 40");
    expect(t.description).toContain("Vaporfly");
    expect(t.description).toContain("+5.2%");
  });

  it("newShoePersonalBestTemplate", () => {
    const t = newShoePersonalBestTemplate("Vaporfly", "10k");
    expect(t.title).toBe("New Shoe Personal Best");
    expect(t.description).toContain("Vaporfly");
    expect(t.description).toContain("10k");
  });
});
