// Frontend API calls for selection/lottery system
import { call } from '../utils/adminUtils';

export const joinLottery = (lotteryId) => call('joinLottery', { lotteryId });
export const getMyLotteryStatus = (lotteryId) => call('getMyLotteryStatus', { lotteryId });
export const getLotteryPublic = (lotteryId) => call('getLotteryPublic', { lotteryId });
export const drawLottery = (lotteryId, seed) => call('drawLottery', { lotteryId, seed });

export default {
  joinLottery,
  getMyLotteryStatus,
  getLotteryPublic,
  drawLottery,
};