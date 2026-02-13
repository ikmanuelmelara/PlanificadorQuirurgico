const HistoricalActivity = require('../../models/HistoricalActivity');

/**
 * Simplified Apriori-style association rules miner.
 * Mines frequent patterns in historical session data:
 *   service + room + session type + day-of-week combinations
 */
async function mineAssociationRules(options = {}) {
  const { minSupport = 0.05, minConfidence = 0.6, minLift = 1.2 } = options;

  // Fetch historical activities with room and service populated
  const activities = await HistoricalActivity.find({ outcome: 'completed' })
    .populate('surgicalService', 'code name')
    .populate('operatingRoom', 'code name')
    .lean();

  if (activities.length < 10) {
    return { rules: [], totalTransactions: activities.length, message: 'Insufficient historical data' };
  }

  const totalTx = activities.length;

  // Build transactions: each activity = set of items
  const transactions = activities.map((a) => {
    const items = new Set();
    if (a.surgicalService?.code) items.add(`service:${a.surgicalService.code}`);
    if (a.operatingRoom?.code) items.add(`room:${a.operatingRoom.code}`);
    if (a.sessionType) items.add(`session:${a.sessionType}`);
    if (a.date) {
      const dow = ['dom', 'lun', 'mar', 'mie', 'jue', 'vie', 'sab'][new Date(a.date).getDay()];
      items.add(`day:${dow}`);
    }
    if (a.priority) items.add(`priority:${a.priority}`);
    return items;
  });

  // Count single-item frequencies
  const itemCounts = {};
  for (const tx of transactions) {
    for (const item of tx) {
      itemCounts[item] = (itemCounts[item] || 0) + 1;
    }
  }

  // Filter frequent single items
  const frequentItems = Object.entries(itemCounts)
    .filter(([, count]) => count / totalTx >= minSupport)
    .map(([item]) => item);

  // Count pair frequencies
  const pairCounts = {};
  for (const tx of transactions) {
    const txItems = frequentItems.filter((item) => tx.has(item));
    for (let i = 0; i < txItems.length; i++) {
      for (let j = i + 1; j < txItems.length; j++) {
        const key = [txItems[i], txItems[j]].sort().join('|');
        pairCounts[key] = (pairCounts[key] || 0) + 1;
      }
    }
  }

  // Generate rules from frequent pairs
  const rules = [];
  for (const [pair, count] of Object.entries(pairCounts)) {
    const support = count / totalTx;
    if (support < minSupport) continue;

    const [itemA, itemB] = pair.split('|');
    const countA = itemCounts[itemA];
    const countB = itemCounts[itemB];

    // Rule: A -> B
    const confAB = count / countA;
    const liftAB = confAB / (countB / totalTx);
    if (confAB >= minConfidence && liftAB >= minLift) {
      rules.push({
        antecedent: [itemA],
        consequent: [itemB],
        support: round(support),
        confidence: round(confAB),
        lift: round(liftAB),
        count,
      });
    }

    // Rule: B -> A
    const confBA = count / countB;
    const liftBA = confBA / (countA / totalTx);
    if (confBA >= minConfidence && liftBA >= minLift) {
      rules.push({
        antecedent: [itemB],
        consequent: [itemA],
        support: round(support),
        confidence: round(confBA),
        lift: round(liftBA),
        count,
      });
    }
  }

  // Sort by lift descending
  rules.sort((a, b) => b.lift - a.lift);

  return {
    rules,
    totalTransactions: totalTx,
    frequentItemsCount: frequentItems.length,
    params: { minSupport, minConfidence, minLift },
  };
}

function round(v) {
  return Math.round(v * 1000) / 1000;
}

module.exports = { mineAssociationRules };
