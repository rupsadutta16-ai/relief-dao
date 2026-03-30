import { getContract, defineChain } from "thirdweb";
import { client as baseClient } from "./client";

// Export for other components
export const client = baseClient;

// Polygon Amoy Testnet
export const chain = defineChain(80002);

// UPDATE: This will be the new Amoy address after deployment
export const contractAddress = "0x94d9295BF6415353aA733b63088E8b05f2e48227"; // v2 — .call() fix for smart wallet ETH receive

export const contractABI = [
  "function nextCampaignId() view returns (uint256)",
  "function getCampaignDetails(uint256 _id) view returns (string name, uint256 targetGoal, uint256 totalDonated, uint256 totalReleased, uint8 currentStage, bool isActive, address ngo, uint256 yesVotes, uint256 noVotes, bool milestoneRequested)",
  "function getProofs(uint256 _campaignId) view returns (tuple(string cid, bool isLiveCapture)[])",
  "function createCampaign(string _name, uint256 _targetGoal)",
  "function donate(uint256 _campaignId) payable",
  "function submitProof(uint256 _campaignId, string _cid, bool _isLiveCapture)",
  "function approveMilestone(uint256 _campaignId)",
  "function requestMilestoneRelease(uint256 _campaignId)",
  "function vote(uint256 _campaignId, bool _support)",
  "function hasVoted(uint256 _campaignId, address _voter) view returns (bool)",
  "event DonationReceived(uint256 indexed id, address donor, uint256 amount)",
  "event MilestoneApproved(uint256 indexed id, uint8 stage, uint256 amountReleased)",
  "event MilestoneReleaseRequested(uint256 indexed id, uint8 stage)",
  "event Voted(uint256 indexed id, address voter, bool support, uint256 yesTotal, uint256 noTotal)"
] as const;

export const contract = getContract({
  client,
  chain,
  address: contractAddress,
  abi: contractABI as any,
});
