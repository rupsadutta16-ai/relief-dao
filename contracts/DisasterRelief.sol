// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

import "@openzeppelin/contracts/access/Ownable.sol";

/**
 * @title DisasterRelief
 * @dev Manages relief campaigns with a 3-tranche payout system, IPFS audit trails, and Beneficiary voting.
 */
contract DisasterRelief is Ownable {
    
    struct Proof {
        string cid;
        bool isLiveCapture;
    }

    struct Campaign {
        string name;
        uint256 targetGoal;
        uint256 totalDonated;
        uint256 totalReleased;
        address payable ngo;
        uint8 currentStage;
        bool isActive;
        Proof[] proofs;
        uint256 yesVotes;
        uint256 noVotes;
        bool milestoneRequested; // NGO must request before beneficiaries can vote
    }

    mapping(uint256 => Campaign) public campaigns;
    uint256 public nextCampaignId;
    mapping(uint256 => mapping(address => bool)) public hasVoted;

    event CampaignStarted(uint256 indexed id, string name, uint256 targetGoal, address ngo);
    event DonationReceived(uint256 indexed id, address donor, uint256 amount);
    event ProofSubmitted(uint256 indexed id, string cid, uint8 stage, bool isLiveCapture);
    event MilestoneApproved(uint256 indexed id, uint8 stage, uint256 amountReleased);
    event MilestoneReleaseRequested(uint256 indexed id, uint8 stage);
    event Voted(uint256 indexed id, address voter, bool support, uint256 yesTotal, uint256 noTotal);

    constructor(address initialOwner) Ownable(initialOwner) {}

    /**
     * @dev Create a new campaign. The sender is the NGO and recipient of funds.
     */
    function createCampaign(
        string memory _name,
        uint256 _targetGoal
    ) external {
        uint256 campaignId = nextCampaignId++;
        Campaign storage newCampaign = campaigns[campaignId];
        newCampaign.name = _name;
        newCampaign.targetGoal = _targetGoal;
        newCampaign.ngo = payable(msg.sender);
        newCampaign.isActive = true;
        newCampaign.currentStage = 0;
        
        // Mock Live Demo defaults
        newCampaign.yesVotes = 29;
        newCampaign.noVotes = 2;

        emit CampaignStarted(campaignId, _name, _targetGoal, msg.sender);
    }

    /**
     * @dev Donate native tokens (POL) to a specific campaign.
     */
    function donate(uint256 _campaignId) external payable {
        Campaign storage campaign = campaigns[_campaignId];
        require(campaign.isActive, "Campaign is not active");
        require(msg.value > 0, "Donation must be greater than 0");
        
        campaign.totalDonated += msg.value;
        emit DonationReceived(_campaignId, msg.sender, msg.value);
    }

    /**
     * @dev Submit an IPFS CID as proof for the current milestone of a campaign.
     * @param _isLiveCapture true if captured live from device camera (Channel A), false for documents.
     */
    function submitProof(uint256 _campaignId, string calldata _cid, bool _isLiveCapture) external {
        Campaign storage campaign = campaigns[_campaignId];
        require(campaign.isActive, "Campaign is not active");
        campaign.proofs.push(Proof({cid: _cid, isLiveCapture: _isLiveCapture}));
        emit ProofSubmitted(_campaignId, _cid, campaign.currentStage, _isLiveCapture);
    }

    /**
     * @dev NGO requests a milestone release — opens voting window for beneficiaries.
     * Only applicable for Stage 1+. Stage 0 (startup) is released directly by NGO.
     */
    function requestMilestoneRelease(uint256 _campaignId) external {
        Campaign storage campaign = campaigns[_campaignId];
        require(msg.sender == campaign.ngo, "Only NGO can request");
        require(campaign.isActive, "Campaign not active");
        require(campaign.currentStage >= 1, "Startup tranche must be released first");
        require(campaign.currentStage < 3, "Campaign already completed");
        require(!campaign.milestoneRequested, "Already pending beneficiary vote");

        campaign.milestoneRequested = true;
        // Reset vote tallies for the new voting round (keep demo defaults)
        campaign.yesVotes = 29;
        campaign.noVotes = 2;

        emit MilestoneReleaseRequested(_campaignId, campaign.currentStage);
    }

    /**
     * @dev Beneficiaries can vote to unlock milestone (only after NGO requests).
     */
    function vote(uint256 _campaignId, bool _support) external {
        Campaign storage campaign = campaigns[_campaignId];
        require(campaign.isActive, "Campaign is not active");
        require(campaign.currentStage < 3, "Campaign already completed");
        require(campaign.milestoneRequested, "NGO has not requested milestone release yet");
        require(!hasVoted[_campaignId][msg.sender], "Already voted");

        hasVoted[_campaignId][msg.sender] = true;

        if (_support) {
            campaign.yesVotes += 1;
        } else {
            campaign.noVotes += 1;
        }

        emit Voted(_campaignId, msg.sender, _support, campaign.yesVotes, campaign.noVotes);

        // Auto trigger the milestone release automatically on 30th Yes vote
        if (campaign.yesVotes >= 30) {
            campaign.milestoneRequested = false; // reset gate
            _approveMilestone(_campaignId);
        }
    }

    /**
     * @dev Approve the current milestone and release the next tranche of funds.
     * For now, only the NGO (creator) or Owner can trigger this manually.
     */
    function approveMilestone(uint256 _campaignId) external {
        Campaign storage campaign = campaigns[_campaignId];
        require(msg.sender == owner() || msg.sender == campaign.ngo, "Not authorized");
        require(campaign.currentStage < 3, "Campaign already completed");
        
        _approveMilestone(_campaignId);
    }

    /**
     * @dev Internal milestone unlocking logic executed by manual trigger or consensus.
     * Advances the stage and emits event even if no funds are available (demo-friendly).
     */
    function _approveMilestone(uint256 _campaignId) internal {
        Campaign storage campaign = campaigns[_campaignId];
        uint8 stage = campaign.currentStage;
        uint256 amountToRelease;

        if (stage == 0) {
            uint256 threshold = (campaign.targetGoal * 10) / 100;
            require(campaign.totalDonated >= threshold, "Wait until 10% of goal is raised");
            amountToRelease = threshold;
            campaign.currentStage = 1;
        } else if (stage == 1) {
            amountToRelease = (campaign.targetGoal * 40) / 100;
            if (amountToRelease > (campaign.totalDonated - campaign.totalReleased)) {
                amountToRelease = campaign.totalDonated - campaign.totalReleased;
            }
            campaign.currentStage = 2;
        } else if (stage == 2) {
            amountToRelease = campaign.totalDonated - campaign.totalReleased;
            campaign.currentStage = 3;
            campaign.isActive = false;
        }

        // Transfer only if there are funds — stage still advances for demo purposes
        if (amountToRelease > 0) {
            campaign.totalReleased += amountToRelease;
            // .transfer() hard-caps at 2300 gas and will revert for smart contract
            // wallets (ERC-4337 / AA). Use .call{value:}() instead.
            (bool success, ) = campaign.ngo.call{value: amountToRelease}("");
            require(success, "ETH transfer to NGO failed");
        }

        emit MilestoneApproved(_campaignId, stage, amountToRelease);
    }

    function getProofs(uint256 _campaignId) external view returns (Proof[] memory) {
        return campaigns[_campaignId].proofs;
    }

    function getCampaignDetails(uint256 _campaignId) external view returns (
        string memory name,
        uint256 target,
        uint256 donated,
        uint256 released,
        uint8 stage,
        bool active,
        address ngo,
        uint256 yesVotes,
        uint256 noVotes,
        bool milestoneRequested
    ) {
        Campaign storage campaign = campaigns[_campaignId];
        return (
            campaign.name,
            campaign.targetGoal,
            campaign.totalDonated,
            campaign.totalReleased,
            campaign.currentStage,
            campaign.isActive,
            campaign.ngo,
            campaign.yesVotes,
            campaign.noVotes,
            campaign.milestoneRequested
        );
    }
}
