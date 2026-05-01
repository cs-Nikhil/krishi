const Customer = require("../models/Customer");
const { buildHindiSearchTerms } = require("../utils/transliterateHindi");

const MS_PER_DAY = 24 * 60 * 60 * 1000;
const DEFAULT_DUE_THRESHOLDS = [500, 1000, 5000];

const escapeRegex = (value = "") => value.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");

const toNumber = (value, fallback = 0) => {
  const parsed = Number(value);
  return Number.isFinite(parsed) ? parsed : fallback;
};

const toPositiveNumber = (value, fallback) => {
  const parsed = Number(value);
  return Number.isFinite(parsed) && parsed > 0 ? parsed : fallback;
};

const getDueThresholds = () => {
  const configured = String(process.env.DUE_NOTIFICATION_THRESHOLDS || "")
    .split(",")
    .map((value) => Number(value.trim()))
    .filter((value) => Number.isFinite(value) && value > 0)
    .sort((a, b) => a - b);

  return configured.length ? configured : DEFAULT_DUE_THRESHOLDS;
};

const getHighDueThreshold = () => {
  const thresholds = getDueThresholds();
  return toPositiveNumber(process.env.DUE_HIGH_CUSTOMER_THRESHOLD, thresholds[1] || thresholds[0] || 1000);
};

const getHighPriorityThreshold = () => {
  const thresholds = getDueThresholds();
  return toPositiveNumber(process.env.DUE_HIGH_PRIORITY_THRESHOLD, thresholds[thresholds.length - 1] || 5000);
};

const getOverdueDays = (value) => toPositiveNumber(value || process.env.DUE_OVERDUE_DAYS, 30);

const startOfDay = (date) => {
  const next = new Date(date);
  next.setHours(0, 0, 0, 0);
  return next;
};

const endOfDay = (date) => {
  const next = new Date(date);
  next.setHours(23, 59, 59, 999);
  return next;
};

const daysAgo = (days, now = new Date()) => new Date(now.getTime() - days * MS_PER_DAY);

const monthsAgo = (months, now = new Date()) => {
  const next = new Date(now);
  next.setMonth(next.getMonth() - months);
  return next;
};

const getReportDateRange = (query = {}, now = new Date()) => {
  const preset = query.datePreset || "last30";

  if (preset === "custom") {
    const start = query.startDate ? startOfDay(new Date(query.startDate)) : startOfDay(daysAgo(29, now));
    const end = query.endDate ? endOfDay(new Date(query.endDate)) : endOfDay(now);
    return { preset, start, end };
  }

  if (preset === "last7") {
    return { preset, start: startOfDay(daysAgo(6, now)), end: endOfDay(now) };
  }

  if (preset === "last2months") {
    return { preset, start: startOfDay(monthsAgo(2, now)), end: endOfDay(now) };
  }

  return { preset: "last30", start: startOfDay(daysAgo(29, now)), end: endOfDay(now) };
};

const buildSearchMatch = (query = {}) => {
  const and = [];
  const addRegexMatch = (fields, value, includeHindiTerms = false) => {
    const terms = includeHindiTerms ? buildHindiSearchTerms(value) : [value].filter(Boolean);
    if (!terms.length) return;

    and.push({
      $or: terms.flatMap((term) => {
        const regex = new RegExp(escapeRegex(term), "i");
        return fields.map((field) => ({ [field]: regex }));
      })
    });
  };

  addRegexMatch(["name", "nameHindi", "phone", "address", "addressHindi", "customerId"], query.search, true);
  addRegexMatch(["name", "nameHindi"], query.name, true);
  addRegexMatch(["phone"], query.phone);
  addRegexMatch(["customerId"], query.customerId);

  return and.length ? { $and: and } : {};
};

const buildPeriodCondition = (field, dateRange) => {
  if (!dateRange?.start || !dateRange?.end) {
    return true;
  }

  return {
    $and: [{ $gte: [field, dateRange.start] }, { $lte: [field, dateRange.end] }]
  };
};

const buildCustomerInsightStages = ({ query = {}, dateRange, now = new Date() } = {}) => {
  const overdueDays = getOverdueDays(query.overdueDays);
  const overdueCutoff = daysAgo(overdueDays, now);
  const inactiveCutoff = daysAgo(30, now);
  const highDueThreshold = toPositiveNumber(query.highDueThreshold, getHighDueThreshold());
  const highPriorityThreshold = getHighPriorityThreshold();
  const mediumDueThreshold = Math.min(highDueThreshold, highPriorityThreshold);
  const dueMin = query.dueMin !== undefined && query.dueMin !== "" ? toNumber(query.dueMin, 0) : null;
  const dueMax = query.dueMax !== undefined && query.dueMax !== "" ? toNumber(query.dueMax, 0) : null;
  const searchMatch = buildSearchMatch(query);
  const match = { isDeleted: { $ne: true }, ...searchMatch };
  const paymentPeriodCondition = buildPeriodCondition("$paymentDate", dateRange);
  const billPeriodCondition = buildPeriodCondition("$purchaseDate", dateRange);
  const epoch = new Date(0);
  const postMatches = [];

  if (dueMin !== null || dueMax !== null) {
    const dueMatch = {};
    if (dueMin !== null) dueMatch.$gte = dueMin;
    if (dueMax !== null) dueMatch.$lte = dueMax;
    postMatches.push({ totalDue: dueMatch });
  }

  switch (query.quickFilter || query.dueStatus || "") {
    case "due":
    case "dueOnly":
      postMatches.push({ totalDue: { $gt: 0 } });
      break;
    case "fullyPaid":
      postMatches.push({ totalDue: { $lte: 0 } });
      break;
    case "overdue30":
    case "overdue":
      postMatches.push({ isOverdue: true });
      break;
    case "highDue":
      postMatches.push({ totalDue: { $gte: highDueThreshold } });
      break;
    case "partial":
      postMatches.push({ totalDue: { $gt: 0 }, totalPaidAmount: { $gt: 0 } });
      break;
    case "inactive":
      postMatches.push({ isInactive: true });
      break;
    case "recent":
      postMatches.push({ createdAt: { $gte: daysAgo(30, now) } });
      break;
    default:
      break;
  }

  return [
    { $match: match },
    {
      $lookup: {
        from: "payments",
        let: { customerId: "$_id" },
        pipeline: [
          { $match: { $expr: { $eq: ["$customer", "$$customerId"] } } },
          {
            $group: {
              _id: null,
              lastPaymentDate: { $max: "$paymentDate" },
              totalPaid: { $sum: "$paidAmount" },
              paymentCount: { $sum: 1 },
              periodPaid: {
                $sum: {
                  $cond: [paymentPeriodCondition, "$paidAmount", 0]
                }
              },
              periodPaymentCount: {
                $sum: {
                  $cond: [paymentPeriodCondition, 1, 0]
                }
              }
            }
          }
        ],
        as: "paymentStats"
      }
    },
    {
      $lookup: {
        from: "bills",
        let: { customerId: "$_id" },
        pipeline: [
          { $match: { $expr: { $eq: ["$customer", "$$customerId"] } } },
          {
            $group: {
              _id: null,
              lastBillDate: { $max: "$purchaseDate" },
              lastBillPaymentDate: {
                $max: {
                  $cond: [{ $gt: ["$paidAmount", 0] }, "$purchaseDate", null]
                }
              },
              totalBilled: { $sum: "$billAmount" },
              billPaidTotal: { $sum: "$paidAmount" },
              billCount: { $sum: 1 },
              partialBillCount: {
                $sum: {
                  $cond: [
                    {
                      $and: [{ $gt: ["$paidAmount", 0] }, { $lt: ["$paidAmount", "$billAmount"] }]
                    },
                    1,
                    0
                  ]
                }
              },
              periodBilled: {
                $sum: {
                  $cond: [billPeriodCondition, "$billAmount", 0]
                }
              },
              periodBillPaid: {
                $sum: {
                  $cond: [billPeriodCondition, "$paidAmount", 0]
                }
              },
              periodBillCount: {
                $sum: {
                  $cond: [billPeriodCondition, 1, 0]
                }
              }
            }
          }
        ],
        as: "billStats"
      }
    },
    {
      $addFields: {
        paymentStats: { $ifNull: [{ $arrayElemAt: ["$paymentStats", 0] }, {}] },
        billStats: { $ifNull: [{ $arrayElemAt: ["$billStats", 0] }, {}] }
      }
    },
    {
      $addFields: {
        totalPaidAmount: {
          $add: [{ $ifNull: ["$paymentStats.totalPaid", 0] }, { $ifNull: ["$billStats.billPaidTotal", 0] }]
        },
        periodPaidAmount: {
          $add: [{ $ifNull: ["$paymentStats.periodPaid", 0] }, { $ifNull: ["$billStats.periodBillPaid", 0] }]
        },
        periodBilledAmount: { $ifNull: ["$billStats.periodBilled", 0] },
        periodTransactionCount: {
          $add: [{ $ifNull: ["$paymentStats.periodPaymentCount", 0] }, { $ifNull: ["$billStats.periodBillCount", 0] }]
        },
        transactionCount: {
          $add: [{ $ifNull: ["$paymentStats.paymentCount", 0] }, { $ifNull: ["$billStats.billCount", 0] }]
        },
        lastPaymentCandidate: {
          $max: [
            { $ifNull: ["$paymentStats.lastPaymentDate", epoch] },
            { $ifNull: ["$billStats.lastBillPaymentDate", epoch] }
          ]
        },
        lastActivityCandidate: {
          $max: [
            { $ifNull: ["$paymentStats.lastPaymentDate", epoch] },
            { $ifNull: ["$billStats.lastBillDate", epoch] },
            { $ifNull: ["$createdAt", epoch] }
          ]
        }
      }
    },
    {
      $addFields: {
        dueAmount: { $ifNull: ["$totalDue", 0] },
        creditLimit: { $ifNull: ["$creditLimit", 0] },
        lastPaymentDate: {
          $cond: [{ $eq: ["$lastPaymentCandidate", epoch] }, null, "$lastPaymentCandidate"]
        },
        lastActivityDate: {
          $cond: [{ $eq: ["$lastActivityCandidate", epoch] }, "$createdAt", "$lastActivityCandidate"]
        }
      }
    },
    {
      $addFields: {
        overdueBaseDate: { $ifNull: ["$lastPaymentDate", { $ifNull: ["$billStats.lastBillDate", "$createdAt"] }] },
        daysWithoutPayment: {
          $cond: [
            "$lastPaymentDate",
            { $floor: { $divide: [{ $subtract: [now, "$lastPaymentDate"] }, MS_PER_DAY] } },
            null
          ]
        }
      }
    },
    {
      $addFields: {
        isOverdue: {
          $and: [{ $gt: ["$totalDue", 0] }, { $lte: ["$overdueBaseDate", overdueCutoff] }]
        },
        isInactive: {
          $and: [{ $gt: ["$totalDue", 0] }, { $lte: ["$overdueBaseDate", inactiveCutoff] }]
        },
        isHighDue: { $gte: ["$totalDue", highDueThreshold] },
        creditExceeded: {
          $and: [{ $gt: ["$creditLimit", 0] }, { $gt: ["$totalDue", "$creditLimit"] }]
        },
        hasPartialPayment: {
          $and: [{ $gt: ["$totalDue", 0] }, { $gt: ["$totalPaidAmount", 0] }]
        }
      }
    },
    {
      $addFields: {
        riskLevel: {
          $switch: {
            branches: [
              {
                case: {
                  $or: [
                    "$creditExceeded",
                    { $gte: ["$totalDue", highPriorityThreshold] },
                    { $and: ["$isOverdue", { $gt: ["$totalDue", 0] }] }
                  ]
                },
                then: "high"
              },
              {
                case: {
                  $or: [{ $gte: ["$totalDue", mediumDueThreshold] }, "$hasPartialPayment"]
                },
                then: "medium"
              }
            ],
            default: "low"
          }
        }
      }
    },
    ...(postMatches.length ? [{ $match: { $and: postMatches } }] : []),
    {
      $project: {
        paymentStats: 0,
        billStats: 0,
        lastPaymentCandidate: 0,
        lastActivityCandidate: 0,
        overdueBaseDate: 0
      }
    }
  ];
};

const getCustomerSort = (query = {}) => {
  if (["due", "dueOnly", "highDue", "overdue30", "overdue"].includes(query.quickFilter)) {
    return { totalDue: -1, updatedAt: -1 };
  }

  if (query.quickFilter === "recent") {
    return { createdAt: -1 };
  }

  return { updatedAt: -1 };
};

const getCustomersWithInsights = async ({ query = {}, pagination, now = new Date() }) => {
  const stages = buildCustomerInsightStages({ query, now });
  const [result] = await Customer.aggregate([
    ...stages,
    {
      $facet: {
        customers: [{ $sort: getCustomerSort(query) }, { $skip: pagination.skip }, { $limit: pagination.limit }],
        total: [{ $count: "count" }]
      }
    }
  ]);

  return {
    customers: result?.customers || [],
    total: result?.total?.[0]?.count || 0
  };
};

const buildReport = async (query = {}) => {
  const now = new Date();
  const dateRange = getReportDateRange(query, now);
  const stages = buildCustomerInsightStages({ query, dateRange, now });
  const [result = {}] = await Customer.aggregate([
    ...stages,
    {
      $facet: {
        filteredCustomers: [{ $sort: { totalDue: -1, updatedAt: -1 } }, { $limit: 500 }],
        financial: [
          {
            $group: {
              _id: null,
              totalPaymentsCollected: { $sum: "$periodPaidAmount" },
              totalOutstandingDues: { $sum: "$totalDue" },
              totalBilled: { $sum: "$periodBilledAmount" },
              totalCustomers: { $sum: 1 },
              dueCustomers: {
                $sum: { $cond: [{ $gt: ["$totalDue", 0] }, 1, 0] }
              },
              fullyPaidCustomers: {
                $sum: { $cond: [{ $lte: ["$totalDue", 0] }, 1, 0] }
              },
              partialPaymentCustomers: {
                $sum: { $cond: ["$hasPartialPayment", 1, 0] }
              },
              overdueCustomers: {
                $sum: { $cond: ["$isOverdue", 1, 0] }
              }
            }
          }
        ],
        dueCustomersList: [{ $match: { totalDue: { $gt: 0 } } }, { $sort: { totalDue: -1 } }, { $limit: 100 }],
        highRiskCustomers: [{ $match: { riskLevel: "high" } }, { $sort: { totalDue: -1 } }, { $limit: 100 }],
        inactiveCustomers: [{ $match: { isInactive: true } }, { $sort: { totalDue: -1 } }, { $limit: 100 }],
        frequentCustomers: [
          { $match: { periodTransactionCount: { $gte: 3 } } },
          { $sort: { periodTransactionCount: -1, updatedAt: -1 } },
          { $limit: 100 }
        ]
      }
    }
  ]);

  const financial = result.financial?.[0] || {
    totalPaymentsCollected: 0,
    totalOutstandingDues: 0,
    totalBilled: 0,
    totalCustomers: 0,
    dueCustomers: 0,
    fullyPaidCustomers: 0,
    partialPaymentCustomers: 0,
    overdueCustomers: 0
  };
  const recoveryBase = financial.totalPaymentsCollected + financial.totalOutstandingDues;
  const dueRecoveryPercentage = recoveryBase > 0 ? Math.round((financial.totalPaymentsCollected / recoveryBase) * 100) : 0;

  return {
    dateRange,
    financial: {
      ...financial,
      dueRecoveryPercentage
    },
    customers: {
      filtered: result.filteredCustomers || [],
      due: result.dueCustomersList || [],
      highRisk: result.highRiskCustomers || [],
      inactive: result.inactiveCustomers || [],
      frequent: result.frequentCustomers || []
    }
  };
};

const getDueNotificationCandidates = async ({ now = new Date(), overdueDays, minDue } = {}) => {
  const thresholds = getDueThresholds();
  const query = {
    overdueDays: overdueDays || process.env.DUE_NOTIFICATION_INACTIVE_DAYS || process.env.DUE_OVERDUE_DAYS || 30
  };
  const minimumDue = toPositiveNumber(minDue, thresholds[0]);

  return Customer.aggregate([
    ...buildCustomerInsightStages({ query, now }),
    {
      $match: {
        totalDue: { $gt: minimumDue },
        isOverdue: true
      }
    },
    { $sort: { totalDue: -1 } }
  ]);
};

module.exports = {
  buildCustomerInsightStages,
  buildReport,
  getCustomersWithInsights,
  getDueNotificationCandidates,
  getDueThresholds,
  getHighDueThreshold,
  getHighPriorityThreshold,
  getOverdueDays,
  getReportDateRange
};
