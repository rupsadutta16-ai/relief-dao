// --- THIRDWEB CONFIGURATION (COMMENTED OUT) ---
/*
import { getContract, defineChain } from "thirdweb";
import { client } from "./client";

export const chain = defineChain({
  id: 1337,
  rpc: "http://127.0.0.1:8545",
});

export const contract = getContract({
  client,
  chain,
  address: contractAddress,
});
*/

// Update this after running: npx hardhat run scripts/deploy.cjs --network localhost
export const contractAddress = "0x5FbDB2315678afecb367f032d93F642f64180aa3";

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
];
