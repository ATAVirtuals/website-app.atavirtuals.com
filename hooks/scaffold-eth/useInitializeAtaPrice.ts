import { useCallback, useEffect } from "react";
import { useTargetNetwork } from "./useTargetNetwork";
import { useInterval } from "usehooks-ts";
import scaffoldConfig from "~~/scaffold.config";
import { useGlobalState } from "~~/services/store/store";
import { fetchATAPriceFromUniswap } from "~~/utils/scaffold-eth";

/**
 * Get the price of ATA based on ATA/USD trading pair from Uniswap SDK
 */
export const useInitializeAtaPrice = () => {
  const setATAPrice = useGlobalState(state => state.setATAPrice);
  const setIsATAFetching = useGlobalState(state => state.setIsATAFetching);
  const { targetNetwork } = useTargetNetwork();

  const fetchPrice = useCallback(async () => {
    try {
      setIsATAFetching(true);
      const price = await fetchATAPriceFromUniswap();
      setATAPrice(price);
    } catch (error) {
      console.error("Error fetching ATA price:", error);
    } finally {
      setIsATAFetching(false);
    }
  }, [setIsATAFetching, setATAPrice, targetNetwork]);

  // Get the price of ATA from Uniswap on mount
  useEffect(() => {
    fetchPrice();
  }, [fetchPrice]);

  // Get the price of ATA from Uniswap at a given interval
  useInterval(fetchPrice, scaffoldConfig.enablePolling ? scaffoldConfig.pollingInterval : null);
};
