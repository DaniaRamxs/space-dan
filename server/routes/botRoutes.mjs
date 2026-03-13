/**
 * Bot API Routes
 * Endpoints para interactuar con los bots de comunidad
 */

import { Router } from 'express';
import { createClient } from '@supabase/supabase-js';
import ChimuGotchiBot from '../modules/bots/ChimuGotchiBot.mjs';
import WelcomeBot from '../modules/bots/WelcomeBot.mjs';

const router = Router();

// Initialize Supabase client
const supabaseUrl = process.env.SUPABASE_URL;
const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

// Initialize bots
const chimuBot = new ChimuGotchiBot(supabaseUrl, supabaseKey);
const welcomeBot = new WelcomeBot(supabaseUrl, supabaseKey);

/**
 * POST /api/bots/command
 * Ejecutar comando de bot
 */
router.post('/command', async (req, res) => {
  try {
    const { communityId, botType, command, args = [], userId } = req.body;

    if (!communityId || !botType || !userId) {
      return res.status(400).json({ 
        error: 'Missing required fields: communityId, botType, userId' 
      });
    }

    let result;

    switch (botType) {
      case 'chimugotchi':
        result = await chimuBot.handleCommand(userId, communityId, command, args);
        break;
      
      case 'welcome':
        // Get community info
        const { data: community } = await chimuBot.supabase
          .from('communities')
          .select('*')
          .eq('id', communityId)
          .single();
        
        const { data: user } = await chimuBot.supabase
          .from('profiles')
          .select('*')
          .eq('id', userId)
          .single();
        
        const settings = await welcomeBot.getSettings(communityId);
        
        if (command === 'welcome') {
          result = await welcomeBot.generateWelcomeEmbed(user, community, settings);
        } else if (command === 'goodbye') {
          result = await welcomeBot.generateGoodbyeEmbed(user, community, {
            customMessage: settings.goodbyeMessage,
            accentColor: settings.goodbyeColor,
            showMemberCount: settings.showMemberCount
          });
        } else {
          result = { error: 'Unknown welcome command' };
        }
        break;

      default:
        return res.status(400).json({ error: 'Unknown bot type' });
    }

    res.json({ success: true, result });
  } catch (error) {
    console.error('[Bot API] Command error:', error);
    res.status(500).json({ error: error.message });
  }
});

/**
 * GET /api/bots/settings/:communityId/:botType
 * Obtener configuración de bot
 */
router.get('/settings/:communityId/:botType', async (req, res) => {
  try {
    const { communityId, botType } = req.params;
    
    let settings;
    
    switch (botType) {
      case 'welcome':
        settings = await welcomeBot.getSettings(communityId);
        break;
      default:
        const { data } = await chimuBot.supabase
          .from('community_bot_settings')
          .select('settings')
          .eq('community_id', communityId)
          .eq('bot_type', botType)
          .single();
        settings = data?.settings || {};
    }

    res.json({ success: true, settings });
  } catch (error) {
    console.error('[Bot API] Get settings error:', error);
    res.status(500).json({ error: error.message });
  }
});

/**
 * POST /api/bots/settings/:communityId/:botType
 * Guardar configuración de bot
 */
router.post('/settings/:communityId/:botType', async (req, res) => {
  try {
    const { communityId, botType } = req.params;
    const { settings } = req.body;

    if (!settings) {
      return res.status(400).json({ error: 'Settings required' });
    }

    switch (botType) {
      case 'welcome':
        await welcomeBot.saveSettings(communityId, settings);
        break;
      default:
        const { error } = await chimuBot.supabase
          .from('community_bot_settings')
          .upsert({
            community_id: communityId,
            bot_type: botType,
            settings,
            updated_at: new Date().toISOString()
          }, {
            onConflict: 'community_id,bot_type'
          });
        if (error) throw error;
    }

    res.json({ success: true });
  } catch (error) {
    console.error('[Bot API] Save settings error:', error);
    res.status(500).json({ error: error.message });
  }
});

/**
 * GET /api/bots/chimugotchi/leaderboard/:communityId
 * Leaderboard de palomitas
 */
router.get('/chimugotchi/leaderboard/:communityId', async (req, res) => {
  try {
    const { communityId } = req.params;
    const result = await chimuBot.getLeaderboard(communityId);
    res.json({ success: true, result });
  } catch (error) {
    console.error('[Bot API] Leaderboard error:', error);
    res.status(500).json({ error: error.message });
  }
});

/**
 * GET /api/bots/chimugotchi/shop
 * Tienda de items
 */
router.get('/chimugotchi/shop', async (req, res) => {
  try {
    const { data: items, error } = await chimuBot.supabase
      .from('chimugotchi_items')
      .select('*')
      .order('price', { ascending: true });

    if (error) throw error;

    res.json({ success: true, items: items || [] });
  } catch (error) {
    console.error('[Bot API] Shop error:', error);
    res.status(500).json({ error: error.message });
  }
});

/**
 * POST /api/bots/chimugotchi/buy
 * Comprar item
 */
router.post('/chimugotchi/buy', async (req, res) => {
  try {
    const { petId, itemId, userId } = req.body;

    // Get pet
    const { data: pet, error: petError } = await chimuBot.supabase
      .from('chimugotchi_pets')
      .select('*')
      .eq('id', petId)
      .eq('owner_id', userId)
      .single();

    if (petError || !pet) {
      return res.status(404).json({ error: 'Pet not found' });
    }

    // Get item
    const { data: item, error: itemError } = await chimuBot.supabase
      .from('chimugotchi_items')
      .select('*')
      .eq('id', itemId)
      .single();

    if (itemError || !item) {
      return res.status(404).json({ error: 'Item not found' });
    }

    // Check coins
    if (pet.coins < item.price) {
      return res.status(400).json({ 
        error: `Necesitas ${item.price} monedas. Tienes ${pet.coins}.` 
      });
    }

    // Apply effect
    const effect = item.effect || {};
    const newStats = {
      hunger: Math.min(100, pet.hunger + (effect.hunger || 0)),
      happiness: Math.min(100, pet.happiness + (effect.happiness || 0)),
      energy: Math.min(100, pet.energy + (effect.energy || 0)),
      health: Math.min(100, pet.health + (effect.health || 0)),
      hygiene: Math.min(100, pet.hygiene + (effect.hygiene || 0)),
      coins: pet.coins - item.price
    };

    // Add to inventory
    const inventory = pet.inventory || [];
    inventory.push({
      item_id: item.id,
      name: item.name,
      emoji: item.emoji,
      used_at: new Date().toISOString()
    });

    // Update pet
    const { error: updateError } = await chimuBot.supabase
      .from('chimugotchi_pets')
      .update({
        ...newStats,
        inventory,
        last_interaction: new Date().toISOString()
      })
      .eq('id', petId);

    if (updateError) throw updateError;

    res.json({
      success: true,
      message: `${item.emoji} Compraste **${item.name}**!`,
      remainingCoins: newStats.coins
    });
  } catch (error) {
    console.error('[Bot API] Buy error:', error);
    res.status(500).json({ error: error.message });
  }
});

export default router;
