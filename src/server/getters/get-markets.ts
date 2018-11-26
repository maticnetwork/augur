import * as t from "io-ts";
import * as Knex from "knex";
import { Address, MarketsContractAddressAndFeesRow, SortLimitParams } from "../../types";
import { getMarketsWithReportingState, queryModifier } from "./database";
import { createSearchProvider } from "../../database/fts";

export const GetMarketsParamsSpecific = t.type({
  universe: t.string,
  creator: t.union([t.string, t.null, t.undefined]),
  category: t.union([t.string, t.null, t.undefined]),
  search: t.union([t.string, t.null, t.undefined]),
  reportingState: t.union([t.string, t.null, t.undefined]),
  feeWindow: t.union([t.string, t.null, t.undefined]),
  designatedReporter: t.union([t.string, t.null, t.undefined]),
  maxFee: t.union([t.number, t.null, t.undefined]),
});

export const GetMarketsParams = t.intersection([
  GetMarketsParamsSpecific,
  SortLimitParams,
]);

// Returning marketIds should likely be more generalized, since it is a single line change for most getters (awaiting reporting, by user, etc)
export async function getMarkets(db: Knex, augur: {}, params: t.TypeOf<typeof GetMarketsParams>) {
  let columns = ["markets.marketId", "marketStateBlock.timestamp as reportingStateUpdatedOn"];
  if (params.maxFee != null && params.maxFee !== undefined) columns = columns.concat(["markets.reportingFeeRate", "markets.marketCreatorFeeRate"]);
  const query = getMarketsWithReportingState(db, columns);
  query.join("blocks as marketStateBlock", "marketStateBlock.blockNumber", "market_state.blockNumber");
  query.leftJoin("blocks as lastTradeBlock", "lastTradeBlock.blockNumber", "markets.lastTradeBlockNumber").select("lastTradeBlock.timestamp as lastTradeTime");

  if (params.universe != null) query.where("universe", params.universe);
  if (params.creator != null) query.where({ marketCreator: params.creator });
  if (params.category != null) query.whereRaw("LOWER(markets.category) = ?", [params.category.toLowerCase()]);
  if (params.reportingState != null) query.where("reportingState", params.reportingState);
  if (params.feeWindow != null) query.where("feeWindow", params.feeWindow);
  if (params.designatedReporter != null) query.where("designatedReporter", params.designatedReporter);

  const searchProvider = createSearchProvider(db);
  if (params.search != null && searchProvider !== null) {
    query.whereIn("markets.marketId", function (this: Knex.QueryBuilder) {
      searchProvider.searchBuilder(this, params.search!);
    });
  }

  let marketsRows = await queryModifier<MarketsContractAddressAndFeesRow<BigNumber>>(db, query, "volume", "desc", params);

  if (params.maxFee != null && params.maxFee !== undefined) {
    const maxFee: number = params.maxFee;
    marketsRows = marketsRows.filter((row: MarketsContractAddressAndFeesRow<BigNumber>) => row.reportingFeeRate.plus(row.marketCreatorFeeRate).lte(maxFee));
  }

  return marketsRows.map((marketsRow: MarketsContractAddressAndFeesRow<BigNumber>): Address => marketsRow.marketId);
}
