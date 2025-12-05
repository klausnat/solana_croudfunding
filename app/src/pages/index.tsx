import React, { useEffect, useState } from 'react';
import { useConnection, useWallet } from '@solana/wallet-adapter-react';
import { WalletMultiButton } from '@solana/wallet-adapter-react-ui';
import { CampaignCard } from '../components/CampaignCard';
import { Campaign, CrowdfundingClient, PROGRAM_ID, NETWORK } from '../utils/program';
import { PublicKey } from '@solana/web3.js';

require('@solana/wallet-adapter-react-ui/styles.css');

export default function Home() {
  const { connection } = useConnection();
  const wallet = useWallet();
  const [campaigns, setCampaigns] = useState<Array<{ pubkey: PublicKey; campaign: Campaign }>>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isCreating, setIsCreating] = useState(false);
  const [formData, setFormData] = useState({
    title: '',
    description: '',
    goalAmount: '1',
    deadlineDays: '30',
    category: '0',
  });

  const client = new CrowdfundingClient(connection, PROGRAM_ID);

  useEffect(() => {
    fetchCampaigns();
  }, [connection]);

  const fetchCampaigns = async () => {
    try {
      setIsLoading(true);
      const allCampaigns = await client.getAllCampaigns();
      setCampaigns(allCampaigns);
    } catch (error) {
      console.error('Error fetching campaigns:', error);
    } finally {
      setIsLoading(false);
    }
  };

  const handleCreateCampaign = async () => {
    if (!wallet.publicKey) {
      alert('Please connect your wallet');
      return;
    }

    try {
      setIsCreating(true);
      const deadline = Math.floor(Date.now() / 1000) + (parseInt(formData.deadlineDays) * 24 * 60 * 60);
      
      await client.createCampaign(
        wallet,
        formData.title,
        formData.description,
        parseFloat(formData.goalAmount) * 1e9,
        deadline,
        parseInt(formData.category)
      );

      alert('Campaign created successfully!');
      setFormData({
        title: '',
        description: '',
        goalAmount: '1',
        deadlineDays: '30',
        category: '0',
      });
      
      await fetchCampaigns();
    } catch (error) {
      console.error('Error creating campaign:', error);
      alert('Failed to create campaign');
    } finally {
      setIsCreating(false);
    }
  };

  const handleDonate = async (campaignPubkey: PublicKey, amount: number) => {
    await client.donateToCampaign(wallet, campaignPubkey, amount);
    await fetchCampaigns();
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-gray-50 to-gray-100">
      {/* Header */}
      <header className="bg-white shadow-sm">
        <div className="container mx-auto px-4 py-6">
          <div className="flex justify-between items-center">
            <div>
              <h1 className="text-3xl font-bold bg-gradient-to-r from-purple-600 to-blue-600 bg-clip-text text-transparent">
                Solana Crowdfunding
              </h1>
              <p className="text-gray-600">Fund your dreams on the blockchain</p>
            </div>
            <WalletMultiButton className="!bg-gradient-to-r !from-purple-600 !to-blue-600" />
          </div>
        </div>
      </header>

      <main className="container mx-auto px-4 py-8">
        {/* Create Campaign Form */}
        <div className="bg-white rounded-2xl shadow-xl p-8 mb-12">
          <h2 className="text-2xl font-bold mb-6">Start a Campaign</h2>
          
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Campaign Title
              </label>
              <input
                type="text"
                value={formData.title}
                onChange={(e) => setFormData({ ...formData, title: e.target.value })}
                className="w-full border rounded-lg px-4 py-3"
                placeholder="What's your project about?"
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Funding Goal (SOL)
              </label>
              <input
                type="number"
                value={formData.goalAmount}
                onChange={(e) => setFormData({ ...formData, goalAmount: e.target.value })}
                className="w-full border rounded-lg px-4 py-3"
                step="0.1"
                min="0.1"
              />
            </div>

            <div className="md:col-span-2">
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Description
              </label>
              <textarea
                value={formData.description}
                onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                className="w-full border rounded-lg px-4 py-3 h-32"
                placeholder="Tell your story..."
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Duration (Days)
              </label>
              <input
                type="number"
                value={formData.deadlineDays}
                onChange={(e) => setFormData({ ...formData, deadlineDays: e.target.value })}
                className="w-full border rounded-lg px-4 py-3"
                min="1"
                max="365"
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Category
              </label>
              <select
                value={formData.category}
                onChange={(e) => setFormData({ ...formData, category: e.target.value })}
                className="w-full border rounded-lg px-4 py-3"
              >
                <option value="0">Technology</option>
                <option value="1">Art</option>
                <option value="2">Music</option>
                <option value="3">Film</option>
                <option value="4">Games</option>
                <option value="5">Education</option>
                <option value="6">Social</option>
                <option value="7">Other</option>
              </select>
            </div>
          </div>

          <button
            onClick={handleCreateCampaign}
            disabled={isCreating || !wallet.connected}
            className="mt-6 bg-gradient-to-r from-purple-600 to-blue-600 text-white px-8 py-3 rounded-lg font-semibold text-lg hover:opacity-90 disabled:opacity-50"
          >
            {isCreating ? 'Creating...' : 'Launch Campaign'}
          </button>
        </div>

        {/* Campaigns List */}
        <div>
          <div className="flex justify-between items-center mb-8">
            <h2 className="text-2xl font-bold">Active Campaigns</h2>
            <button
              onClick={fetchCampaigns}
              className="text-blue-600 hover:text-blue-800 font-medium"
            >
              Refresh
            </button>
          </div>

          {isLoading ? (
            <div className="text-center py-12">
              <div className="inline-block animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-purple-600"></div>
              <p className="mt-4 text-gray-600">Loading campaigns...</p>
            </div>
          ) : campaigns.length === 0 ? (
            <div className="text-center py-12 bg-white rounded-xl shadow">
              <p className="text-gray-500 text-lg">No campaigns yet. Be the first to create one!</p>
            </div>
          ) : (
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
              {campaigns.map(({ pubkey, campaign }) => (
                <CampaignCard
                  key={pubkey.toString()}
                  campaign={campaign}
                  campaignPubkey={pubkey}
                  onDonate={(amount) => handleDonate(pubkey, amount)}
                />
              ))}
            </div>
          )}
        </div>
      </main>

      {/* Footer */}
      <footer className="mt-12 border-t pt-8 text-center text-gray-500">
        <p>Solana Crowdfunding Platform • Powered by Solana Blockchain</p>
        <p className="mt-2 text-sm">
          Total Campaigns: {campaigns.length} • Total Donations: {
            (campaigns.reduce((sum, { campaign }) => sum + campaign.amount_raised, 0) / 1e9).toFixed(2)
          } SOL
        </p>
      </footer>
    </div>
  );
}