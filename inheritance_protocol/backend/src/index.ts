import { ethers } from 'ethers';
import { Connection, PublicKey } from '@solana/web3.js';
import dotenv from 'dotenv';
import express from 'express';
import { PrismaClient } from '@prisma/client';

dotenv.config();
const prisma = new PrismaClient();
const app = express();
app.use(express.json());

const ETH_RPC = process.env.ETH_RPC!;
const SOL_RPC = process.env.SOL_RPC!;
const INACTIVITY_SECONDS = 180 * 24 * 60 * 60;

const ethProvider = new ethers.JsonRpcProvider(ETH_RPC);
const ethWallet = new ethers.Wallet(process.env.ETH_PRIVATE_KEY!, ethProvider);
const ethContractAbi = [
    "function heartbeat() external",
    "function claim() external",
    "function lastHeartbeat() view returns (uint256)",
    "function isClaimed() view returns (bool)"
];

const solConnection = new Connection(SOL_RPC);
const solProgramId = new PublicKey(process.env.SOL_PROGRAM_ID!);

app.post('/heartbeat', async (req, res) => {
    const { chain, contractAddress, ownerAddress } = req.body;
    await prisma.contract.upsert({
        where: { chain_address: { chain, address: contractAddress } },
        update: { lastHeartbeat: new Date() },
        create: { chain, address: contractAddress, owner: ownerAddress, lastHeartbeat: new Date() }
    });
    res.json({ ok: true });
});

async function checkInactivity() {
    const expired = await prisma.contract.findMany({
        where: {
            lastHeartbeat: { lt: new Date(Date.now() - INACTIVITY_SECONDS * 1000) },
            isClaimed: false
        }
    });
    for (const contract of expired) {
        if (contract.chain === 'ethereum') {
            const inheritance = new ethers.Contract(contract.address, ethContractAbi, ethWallet);
            try {
                const tx = await inheritance.claim();
                await tx.wait();
                console.log(`Claimed ETH: ${tx.hash}`);
            } catch(e) { console.error(e); }
        }
        await prisma.contract.update({ where: { id: contract.id }, data: { isClaimed: true } });
    }
}

setInterval(checkInactivity, 6 * 60 * 60 * 1000);
app.listen(3000, () => console.log('Monitor running on port 3000'));
