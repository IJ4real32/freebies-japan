// Frontend API calls for selection/lottery system

// Simple mock implementation for now
export const joinLottery = async (lotteryId) => {
  console.log('Mock: Joining lottery:', lotteryId);
  return { joined: true, success: true };
};

export const getMyLotteryStatus = async (lotteryId) => {
  console.log('Mock: Getting lottery status:', lotteryId);
  return { 
    lottery: {
      title: "Sample Lottery",
      status: "open",
      maxWinners: 1,
      opensAt: Date.now(),
      closesAt: Date.now() + 86400000, // 1 day from now
      ticketCount: 5,
      winners: null
    },
    joined: false 
  };
};

export const getLotteryPublic = async (lotteryId) => {
  console.log('Mock: Getting public lottery info:', lotteryId);
  return {
    lottery: {
      title: "Sample Lottery",
      itemId: "item123",
      description: "Sample description",
      status: "open",
      maxWinners: 1,
      opensAt: Date.now(),
      closesAt: Date.now() + 86400000,
      ticketCount: 5,
      winners: null
    }
  };
};

export const drawLottery = async (lotteryId, seed) => {
  console.log('Mock: Drawing lottery:', lotteryId, seed);
  return { status: "drawn", winners: ["user123"] };
};

export default {
  joinLottery,
  getMyLotteryStatus,
  getLotteryPublic,
  drawLottery,
};