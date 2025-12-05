import React from 'react';
import { PublicKey } from '@solana/web3.js';
import { Campaign } from '../utils/program';
import { useWallet } from '@solana/wallet-adapter-react';

interface CampaignCardProps {
  campaign: Campaign;
  campaignPubkey: PublicKey;
  onDonate: (amount: number) => Promise<void>;
}

export const CampaignCard: React.FC<CampaignCardProps> = ({
  campaign,
  campaignPubkey,
  onDonate,
}) => {
  const wallet = useWallet();
  const [donationAmount, setDonationAmount] = React.useState('0.1');
  const [isLoading, setIsLoading] = React.useState(false);

  const categories = [
    'Technology', 'Art', 'Music', 'Film', 
    'Games', 'Education', 'Social', 'Other'
  ];

  const progress = (campaign.amount_raised / campaign.goal_amount) * 100;
  const daysLeft = Math.max(0, Math.ceil((campaign.deadline * 1000 - Date.now()) / (1000 * 60 * 60 * 24)));

  const handleDonate = async () => {
    if (!wallet.connected) {
      alert('Please connect your wallet first');
      return;
    }

    try {
      setIsLoading(true);
      const amount = parseFloat(donationAmount) * 1e9; // Convert SOL to lamports
      await onDonate(amount);
      alert('Donation successful!');
    } catch (error) {
      console.error('Donation failed:', error);
      alert('Donation failed');
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="bg-white rounded-lg shadow-lg p-6 mb-6">
      <div className="flex justify-between items-start mb-4">
        <div>
          <h3 className="text-xl font-bold text-gray-900">{campaign.title}</h3>
          <p className="text-gray-600 mt-2">{campaign.description}</p>
        </div>
        <span className="px-3 py-1 bg-blue-100 text-blue-800 rounded-full text-sm">
          {categories[campaign.category]}
        </span>
      </div>

      <div className="mb-4">
        <div className="flex justify-between text-sm text-gray-600 mb-1">
          <span>Raised: {(campaign.amount_raised / 1e9).toFixed(2)} SOL</span>
          <span>Goal: {(campaign.goal_amount / 1e9).toFixed(2)} SOL</span>
        </div>
        <div className="w-full bg-gray-200 rounded-full h-2">
          <div
            className="bg-green-500 h-2 rounded-full"
            style={{ width: `${Math.min(progress, 100)}%` }}
          />
        </div>
      </div>

      <div className="flex justify-between items-center text-sm text-gray-500 mb-4">
        <span>👥 {campaign.donors_count} donors</span>
        <span>⏰ {daysLeft} days left</span>
        <span>By: {new PublicKey(campaign.creator).toBase58().slice(0, 8)}...</span>
      </div>

      {campaign.is_active && !campaign.withdrawn && (
        <div className="flex items-center space-x-4">
          <input
            type="number"
            value={donationAmount}
            onChange={(e) => setDonationAmount(e.target.value)}
            step="0.01"
            min="0.01"
            className="flex-1 border rounded-lg px-4 py-2"
            placeholder="Amount in SOL"
          />
          <button
            onClick={handleDonate}
            disabled={isLoading || !wallet.connected}
            className="bg-gradient-to-r from-purple-600 to-blue-600 text-white px-6 py-2 rounded-lg font-semibold hover:opacity-90 disabled:opacity-50"
          >
            {isLoading ? 'Processing...' : 'Donate'}
          </button>
        </div>
      )}

      {!campaign.is_active && (
        <div className="text-center py-2 bg-gray-100 rounded-lg">
          <span className="text-gray-600 font-medium">
            {campaign.withdrawn ? 'Funds withdrawn' : 'Campaign ended'}
          </span>
        </div>
      )}
    </div>
  );
};