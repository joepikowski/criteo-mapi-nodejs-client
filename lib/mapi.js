/**
 * Criteo MAPI Node.js Client
 * @version 0.9.3
 * @author Joe Pikowski <j.pikowski@criteo.com>
 */

const API_Client = require('./api_client.js');
const fs = require('fs');
const cookie = require('cookie');
const moment = require('moment');

/**
 * Creates a new MAPI Client.
 * @class
 * @extends API_Client
 */
class Criteo_MAPI_Client extends API_Client {

    constructor(id, secret, host = 'api.criteo.com', endpoint = ''){
        super(host);
        this.endpoint = endpoint;
        this.id = id;
        this.secret = secret;
        this.token = '';
    }

    checkAuthentication(r){
        return new Promise( (resolve, reject) => {
            if ((this.token && !r.retry) || r.path === '/oauth2/token'){
                resolve();
            }else{
                reject();
            }
        });
    }

    /**
     * Get oauth2 token from id and secret provided on initialization.
     * @param {function} [callback] - Optional callback
     */
    authenticate(callback){
        const auth = {
            client_id: encodeURIComponent(this.id),
            client_secret: encodeURIComponent(this.secret),
            grant_type: 'client_credentials'
        };
        return this.mapiRequest({
            'method': 'post',
            'path': `/oauth2/token`,
            'body': this.toFormData(auth),
            'handler': this.processAuth.bind(this),
            'callback': callback
        });
    }

    /**
     * Get campaigns for a single advertiser.
     * @param {(integer|string)} advertiser - Criteo advertiser ID
     * @param {function} [callback] - Optional callback
     */
    getCampaignsByAdvertiser(advertiser, callback){
        return this.mapiRequest({
            'method': 'get',
            'path': `/v1/advertisers/${advertiser}/campaigns`,
            'handler': this.processJSON.bind(this),
            'callback': callback
        });
    }

    /**
     * Get all categories for all campaigns of a single advertiser.
     * @param {(integer|string)} advertiser - Criteo advertiser ID
     * @param {boolean} [enabled=false] - Filter for enabled categories
     * @param {function} [callback] - Optional callback
     */
    getCategoriesByAdvertiser(advertiser, enabled = false, callback){
        const data = {
            'enabledOnly': enabled
        };
        return this.mapiRequest({
            'method': 'get',
            'path': `/v1/advertisers/${advertiser}/categories`,
            'query': data,
            'handler': this.processJSON.bind(this),
            'callback': callback
        });
    }

    /**
     * Get category information for an advertiser, irrespective of specific campaigns.
     * @param {(integer|string)} advertiser - Criteo advertiser ID
     * @param {(integer|string)} category - Category ID
     * @param {function} [callback] - Optional callback
     */
    getCategoryByAdvertiser(advertiser, category, callback){
        return this.mapiRequest({
            'method': 'get',
            'path': `/v1/advertisers/${advertiser}/categories/${category}`,
            'handler': this.processJSON.bind(this),
            'callback': callback
        });
    }

    /**
     * Get the audiences for an advertiser.
     * @param {(integer|string)} [advertiser] - Criteo advertiser ID
     * @param {function} [callback] - Optional callback
     */
    getAudiences(advertiser, callback){
        const data = {
            'advertiserId': advertiser
        };
        return this.mapiRequest({
            'method': 'get',
            'path': `/v1/audiences/`,
            'query': data,
            'handler': this.processJSON.bind(this),
            'callback': callback
        });
    }

    /**
     * Create an audience for an advertiser.
     * @param {(integer|string)} advertiser - Criteo advertiser ID
     * @param {object} options
     * @param {string} options.name - Audience name
     * @param {string} [options.description] - Audience description
     * @param {function} [callback] - Optional callback
     */
    createAudience(advertiser, options, callback){
        const data = {
            'advertiserId': advertiser,
            'name': options.name,
            'description': options.description
        };
        return this.mapiRequest({
            'method': 'post',
            'path': `/v1/audiences/userlist`,
            'body': JSON.stringify(data),
            'handler': this.processJSON.bind(this),
            'callback': callback
        });
    }

    /**
     * Delete an audience by ID.
     * @param {(integer|string)} audience - Audience ID
     * @param {function} [callback] - Optional callback
     */
    deleteAudience(audience, callback){
        return this.mapiRequest({
            'method': 'delete',
            'path': `/v1/audiences/${audience}`,
            'handler': this.processResponse.bind(this),
            'callback': callback
        });
    }

    /**
     * Update the metadata of an audience.
     * @param {(integer|string)} audience - Audience ID
     * @param {object} options
     * @param {string} options.name - Audience name
     * @param {string} [options.description] - Audience description
     * @param {function} [callback] - Optional callback
     */
    updateAudience(audience, options = {}, callback){
        const data = {
            'name': options.name,
            'description': options.description
        };
        return this.mapiRequest({
            'method': 'put',
            'path': `/v1/audiences/${audience}`,
            'body': JSON.stringify(data),
            'handler': this.processResponse.bind(this),
            'callback': callback
        });
    }

    /**
     * Remove all users from an audience.
     * @param {(integer|string)} audience - Audience ID
     * @param {function} [callback] - Optional callback
     */
    wipeAudience(audience, callback){
        return this.mapiRequest({
            'method': 'delete',
            'path': `/v1/audiences/userlist/${audience}/users`,
            'handler': this.processJSON.bind(this),
            'callback': callback
        });
    }

    /**
     * Add users to an audience.
     * @param {(integer|string)} audience - Audience ID
     * @param {object} options
     * @param {string} options.schema - 'email', 'madid', 'identityLink', or 'gum'
     * @param {string[]} options.identifiers - An array of ids (limit 50000 per call)
     * @param {(integer|string)} [options.gumCallerId] - Required when adding audience via gum IDs.
     * @param {function} [callback] - Optional callback
     */
    addToAudience(audience, options = {}, callback){
        const data = {
            'operation': 'add',
            'schema': options.schema,
            'identifiers': options.identifiers,
            'gumCallerId': options.gumCallerId
        };
        return this.mapiRequest({
            'method': 'patch',
            'path': `/v1/audiences/userlist/${audience}`,
            'body': JSON.stringify(data),
            'handler': this.processJSON.bind(this),
            'callback': callback
        });
    }

    /**
     * Remove users from an audience.
     * @param {(integer|string)} audience - Audience ID
     * @param {object} options
     * @param {string} options.schema - 'email', 'madid', 'identityLink', or 'gum'
     * @param {string[]} options.identifiers - An array of ids (limit 50000 per call)
     * @param {(integer|string)} [options.gumCallerId] - Required when adding audience via gum IDs.
     * @param {function} [callback] - Optional callback
     */
    removeFromAudience(audience, options = {}, callback){
        const data = {
            'operation': 'remove',
            'schema': options.schema,
            'identifiers': options.identifiers,
            'gumCallerId': options.gumCallerId
        };
        return this.mapiRequest({
            'method': 'patch',
            'path': `/v1/audiences/userlist/${audience}`,
            'body': JSON.stringify(data),
            'handler': this.processJSON.bind(this),
            'callback': callback
        });
    }

    /**
     * Get budgets for a list of advertisers or budget IDs.
     * @param {object} options
     * @param {(integer|string)} [options.advertiserIds]
     * @param {(integer|string)} [options.budgetIds]
     * @param {boolean} [active=true] - Filter for budgets with active campaigns.
     * @param {function} [callback] - Optional callback
     */
    getBudgets(options = {}, active = true, callback){
        const data = {
            'advertiserIds': options.advertiserIds,
            'budgetIds': options.budgetIds,
            'onlyActiveCampaigns': active
        };
        return this.mapiRequest({
            'method': 'get',
            'path': `/v1/budgets`,
            'query': data,
            'handler': this.processJSON.bind(this),
            'callback': callback
        });
    }

    /**
     * Get campaigns by advertiser IDs or campaign IDs.
     * @param {object} options
     * @param {(integer|string)} [options.advertiserIds]
     * @param {(integer|string)} [options.campaignIds]
     * @param {string} [options.campaignStatus] - Running, Archived or NotRunning
     * @param {string} [options.bidType] - Unknown, CPC, COS, or CPO
     * @param {function} [callback] - Optional callback
     */
    getCampaigns(options = {}, callback){
        return this.mapiRequest({
            'method': 'get',
            'path': `/v1/campaigns/`,
            'query': options,
            'handler': this.processJSON.bind(this),
            'callback': callback
        });
    }

    /**
     * Get campaign by ID.
     * @param {(integer|string)} id
     * @param {function} [callback] - Optional callback
     */
    getCampaign(id, callback){
        return this.mapiRequest({
            'method': 'get',
            'path': `/v1/campaigns/${id}`,
            'handler': this.processJSON.bind(this),
            'callback': callback
        });
    }

    /**
     * Get categories by campaign ID.
     * @param {(integer|string)} id
     * @param {boolean} [enabled=false] - Filter for enabled categories
     * @param {function} [callback] - Optional callback
     */
    getCategoriesByCampaign(id, enabled = false, callback){
        const data = {
            'enabledOnly': enabled
        };
        return this.mapiRequest({
            'method': 'get',
            'path': `/v1/campaigns/${id}/categories`,
            'query': data,
            'handler': this.processJSON.bind(this),
            'callback': callback
        });
    }

    /**
     * Get a specific campaign category.
     * @param {(integer|string)} campaign - Campaign ID
     * @param {(integer|string)} category - Category ID
     * @param {function} [callback] - Optional callback
     */
    getCategoryByCampaign(campaign, category, callback){
        return this.mapiRequest({
            'method': 'get',
            'path': `/v1/campaigns/${campaign}/categories/${category}`,
            'handler': this.processJSON.bind(this),
            'callback': callback
        });
    }

    /**
     * Get bids by advertisers, campaigns or categories.
     * @param {object} options
     * @param {(integer|string)} [options.advertiserIds]
     * @param {(integer|string)} [options.budgetIds]
     * @param {(integer|string)} [options.categoryHashCodes]
     * @param {string} [options.bidType] - Unknown, CPC, COS, or CPO
     * @param {string} [options.campaignStatus] - Running, Archived or NotRunning
     * @param {boolean} [options.pendingChanges] - true or false
     * @param {function} [callback] - Optional callback
     */
    getBids(options = {}, callback){
        return this.mapiRequest({
            'method': 'get',
            'path': `/v1/campaigns/bids`,
            'query': options,
            'handler': this.processJSON.bind(this),
            'callback': callback
        });
    }

    /**
     * Update bids by campaign (campaign- and category-level).
     * @param {object[]} campaigns
     * @param {(integer|string)} campaigns[].campaignId
     * @param {(number|string)} campaigns[].bidValue
     * @param {object[]} [campaigns[].categories] - An array of category objects, specifying bids that overwrite the overall campaign bid value.
     * @param {(integer|string)} [campaigns[].categories[].categoryHashCode]
     * @param {(number|string)} [campaigns[].categories[].bidValue]
     * @param {function} [callback] - Optional callback
     */
    updateBids(campaigns = [], callback){
        return this.mapiRequest({
            'method': 'put',
            'path': `/v1/campaigns/bids`,
            'body': JSON.stringify(campaigns),
            'handler': this.processJSON.bind(this),
            'callback': callback
        });
    }

    /**
     * Get categories by campaigns, advertisers, or a list of categories.
     * @param {object} options
     * @param {(integer|string)} [options.campaignIds]
     * @param {(integer|string)} [options.advertiserIds]
     * @param {(integer|string)} [options.categoryHashCodes]
     * @param {boolean} [enabled=false] - Filter for enabled categories
     * @param {function} [callback] - Optional callback
     */
    getCategories(options = {}, enabled = false, callback){
        const data = {
            'campaignIds': options.campaignIds,
            'advertiserIds': options.advertiserIds,
            'categoryHashCodes': options.categoryHashCodes,
            'enabledOnly': enabled
        };
        return this.mapiRequest({
            'method': 'get',
            'path': `/v1/categories`,
            'query': data,
            'handler': this.processJSON.bind(this),
            'callback': callback
        });
    }

    /**
     * Update categories by catalog.
     * @param {object[]} catalogs
     * @param {(integer|string)} catalogs[].catalogId
     * @param {object[]} catalogs[].categories - An array of category objects, specifying enabled or disabled.
     * @param {(integer|string)} catalogs[].categories[].categoryHashCode
     * @param {boolean} catalogs[].categories[].enabled
     * @param {function} [callback] - Optional callback
     */
    updateCategories(catalogs = [], callback){
        return this.mapiRequest({
            'method': 'put',
            'path': `/v1/categories`,
            'body': JSON.stringify(catalogs),
            'handler': this.processJSON.bind(this),
            'callback': callback
        });
    }

    /**
     * Get user's portfolio of advertiser accounts.
     * @param {function} [callback] - Optional callback
     */
    getPortfolio(callback){
        return this.mapiRequest({
            'method': 'get',
            'path': `/v1/portfolio`,
            'handler': this.processJSON.bind(this),
            'callback': callback
        });
    }

    /**
     * Get publisher-level data by advertisers.
     * @param {object} options
     * @param {string} [options.advertiserIds] - Criteo advertiser IDs, comma-separated
     * @param {string} options.startDate - Starting date string, will be auto-converted to ISO for convenience
     * @param {string} options.endDate - Ending date string, will be auto-converted to ISO for convenience
     * @param {function} [callback] - Optional callback
     */
    getPublisherStats(options = {}, callback){
        const data = {
            'advertiserIds': options.advertiserIds,
            'startDate': new Date(options.startDate).toISOString(),
            'endDate': new Date(options.endDate).toISOString()
        };
        return this.mapiRequest({
            'method': 'post',
            'path': `/v1/publishers/stats`,
            'body': JSON.stringify(data),
            'handler': this.processJSON.bind(this),
            'callback': callback
        });
    }

    /**
     * Get reporting on campaign performance.
     * @param {object} query
     * @param {string} [query.advertiserIds] - List of advertiser IDs, comma-separated.
     * @param {string} [query.currency] - ISO Format, three letters
     * @param {string} query.startDate - Start date of the report, will be auto-converted to ISO for convenience
     * @param {string} query.endDate - End date of the report, will be auto-converted to ISO for convenience
     * @param {string} query.format - CSV, Excel, XML or JSON
     * @param {string[]} query.dimensions - AdvertiserId, CampaignId, Hour, Day, etc.
     * @param {string[]} query.metrics - Clicks, Displays, AdvertiserCost, etc.
     * @param {string} [query.timezone] - GMT, PST or JST
     * @param {string} [filepath] - The directory path of a file to save the results to.
     * @param {function} [callback] - Optional callback
     */
    getReport(query, filepath, callback){
        let handler = this.determineStatsHandler(query, filepath);
        query.startDate = new Date(query.startDate).toISOString();
        query.endDate = new Date(query.endDate).toISOString();
        return this.mapiRequest({
            'method': 'post',
            'path': `/v1/statistics/report`,
            'body': JSON.stringify(query),
            'handler': handler,
            'callback': callback
        });
    }

    /**
     * Get reporting on campaign performance.
     * @param {object} query
     * @param {string} query.reportType - CampaignPerformance, FacebookDPA or TransactionID
     * @param {boolean} [query.ignoreXDevice=false] - Ignore cross-device data.
     * @param {string} [query.advertiserIds] - List of advertiser IDs, comma-separated.
     * @param {string} query.startDate - Start date of the report, will be auto-converted to ISO for convenience
     * @param {string} query.endDate - End date of the report, will be auto-converted to ISO for convenience
     * @param {string[]} query.dimensions - CampaignId, AdvertiserId, Seller, Day, Week, Month and/or Year
     * @param {string[]} query.metrics - Clicks, AdvertiserCost and/or Displays
     * @param {string} query.format - CSV, Excel, XML or JSON
     * @param {string} [query.currency] - ISO Format, three letters
     * @param {string} [query.timezone] - GMT, PST or JST
     * @param {string} [filepath] - The directory path of a file to save the results to.
     * @param {function} [callback] - Optional callback
     */
    getStats(query, filepath, callback){
        let handler = this.determineStatsHandler(query, filepath);
        query.startDate = new Date(query.startDate).toISOString();
        query.endDate = new Date(query.endDate).toISOString();
        return this.mapiRequest({
            'method': 'post',
            'path': `/v1/statistics`,
            'body': JSON.stringify(query),
            'handler': handler,
            'callback': callback
        });
    }

    /**
     * Get CRP seller by ID.
     * @param {(integer|string)} id - Seller ID
     * @param {function} [callback] - Optional callback
     */
    getCRPSeller(id, callback){
        return this.mapiRequest({
            'method': 'get',
            'path': `/v2/crp/sellers/${id}`,
            'handler': this.processJSON.bind(this),
            'callback': callback
        });
    }

    /**
     * Get CRP sellers, with optional filters.
     * @param {object} options
     * @param {string} [options.sellerStatus] - Active or Inactive
     * @param {boolean} [options.withProducts]
     * @param {string} [options.withBudgetStatus] Archived, Current or Scheduled
     * @param {string} [options.sellerName]
     * @param {function} [callback] - Optional callback
     */
    getCRPSellers(options = {}, callback){
        const data = {
            'sellerStatus': options.sellerStatus,
            'withProducts': options.withProducts,
            'withBudgetStatus': options.withBudgetStatus,
            'sellerName': options.sellerName
        };
        return this.mapiRequest({
            'method': 'get',
            'path': `/v2/crp/sellers`,
            'query': data,
            'handler': this.processJSON.bind(this),
            'callback': callback
        });
    }

    /**
     * Get CRP budgets by seller ID.
     * @param {(integer|string)} id - Seller ID
     * @param {object} options
     * @param {string} [options.status] - Archived, Current or Scheduled
     * @param {boolean} [options.withBalance]
     * @param {boolean} [options.withSpend]
     * @param {string} [options.startBeforeDate] - Filter for budgets starting before a certain date, will be auto-converted to YYYY-MM-DD for convenience
     * @param {string} [options.endAfterDate] - Filter for budgets ending after a certain date, will be auto-converted to YYYY-MM-DD for convenience
     * @param {(integer|string)} [options.campaignId]
     * @param {string} [options.type] - Capped, Uncapped or Daily
     * @param {function} [callback] - Optional callback
     */
    getCRPBudgetsBySeller(id, options = {}, callback){
        const data = {
            'status': options.status,
            'withBalance': options.withBalance,
            'withSpend': options.withSpend,
            'sellerName': options.sellerName,
            'startBeforeDate': options.startBeforeDate ? moment(options.startBeforeDate).format('YYYY-MM-DD') : null,
            'endAfterDate': options.endAfterDate ? moment(options.endAfterDate).format('YYYY-MM-DD') : null,
            'campaignId': options.campaignId,
            'type': options.type
        };
        return this.mapiRequest({
            'method': 'get',
            'path': `/v2/crp/sellers/${id}/budgets`,
            'query': data,
            'handler': this.processJSON.bind(this),
            'callback': callback
        });
    }

    /**
     * Get CRP campaigns by seller ID, with optional filters.
     * @param {(integer|string)} id - Seller ID
     * @param {object} options
     * @param {string} [options.sellerStatus] - Active or Inactive
     * @param {(integer|string)} [options.campaignId]
     * @param {string} [options.budgetStatus] Archived, Current or Scheduled
     * @param {function} [callback] - Optional callback
     */
    getCRPCampaignsBySeller(id, options = {}, callback){
        const data = {
            'sellerStatus': options.sellerStatus,
            'campaignId': options.campaignId,
            'budgetStatus': options.budgetStatus
        };
        return this.mapiRequest({
            'method': 'get',
            'path': `/v2/crp/sellers/${id}/seller-campaigns`,
            'query': data,
            'handler': this.processJSON.bind(this),
            'callback': callback
        });
    }

    /**
     * Get CRP campaign by ID.
     * @param {string} id - Campaign ID
     * @param {function} [callback] - Optional callback
     */
    getCRPCampaign(id, callback){
        return this.mapiRequest({
            'method': 'get',
            'path': `/v2/crp/seller-campaigns/${id}`,
            'handler': this.processJSON.bind(this),
            'callback': callback
        });
    }

    /**
     * Update CRP campaign bid target by ID.
     * @param {string} id - Campaign ID
     * @param {(integer|string)} bid - Must be non-negative, setting to 0 will deactivate the campaign
     * @param {function} [callback] - Optional callback
     */
    updateCRPBidByCampaign(campaign, bid, callback){
        const data = {
            'bid': bid,
        };
        return this.mapiRequest({
            'method': 'patch',
            'path': `/v2/crp/seller-campaigns/${campaign}`,
            'query': data,
            'handler': this.processJSON.bind(this),
            'callback': callback
        });
    }

    /**
     * Get CRP campaigns, with optional filters.
     * @param {object} options
     * @param {string} [options.sellerStatus] - Active or Inactive
     * @param {(integer|string)} [options.sellerId]
     * @param {(integer|string)} [options.campaignId]
     * @param {string} [options.budgetStatus] Archived, Current or Scheduled
     * @param {function} [callback] - Optional callback
     */
    getCRPCampaigns(options = {}, callback){
        const data = {
            'sellerStatus': options.sellerStatus,
            'sellerId': options.sellerId,
            'campaignId': options.campaignId,
            'budgetStatus': options.budgetStatus
        };
        return this.mapiRequest({
            'method': 'get',
            'path': `/v2/crp/seller-campaigns`,
            'query': data,
            'handler': this.processJSON.bind(this),
            'callback': callback
        });
    }

    /**
     * Update multiple CRP campaigns' bids.
     * @param {object[]} campaigns
     * @param {string} campaigns[].id
     * @param {(integer|string)} campaigns[].bid  - Must be non-negative, setting to 0 will deactivate the campaign
     * @param {function} [callback] - Optional callback
     */
    updateCRPBidsByCampaigns(campaigns = [], callback){
        return this.mapiRequest({
            'method': 'patch',
            'path': `/v2/crp/seller-campaigns`,
            'body': JSON.stringify(campaigns),
            'handler': this.processJSON.bind(this),
            'callback': callback
        });
    }

    /**
     * Get CRP budgets by campaign ID.
     * @param {string} id - Campaign ID
     * @param {object} options
     * @param {string} [options.status] - Archived, Current or Scheduled
     * @param {boolean} [options.withBudget]
     * @param {boolean} [options.withSpend]
     * @param {string} [options.startBeforeDate] - Filter for budgets starting before a certain date, will be auto-converted to YYYY-MM-DD for convenience
     * @param {string} [options.endAfterDate] - Filter for budgets ending after a certain date, will be auto-converted to YYYY-MM-DD for convenience
     * @param {string} [options.type] - Capped, Uncapped or Daily
     * @param {function} [callback] - Optional callback
     */
    getCRPBudgetsByCampaign(id, options = {}, callback){
        const data = {
            'status': options.status,
            'withBudget': options.withBudget,
            'withSpend': options.withSpend,
            'startBeforeDate': options.startBeforeDate ? moment(options.startBeforeDate).format('YYYY-MM-DD') : null,
            'endAfterDate': options.endAfterDate ? moment(options.endAfterDate).format('YYYY-MM-DD') : null,
            'type': options.type
        };
        return this.mapiRequest({
            'method': 'get',
            'path': `/v2/crp/seller-campaigns/${id}/budgets`,
            'query': data,
            'handler': this.processJSON.bind(this),
            'callback': callback
        });
    }

    /**
     * Get CRP budget by ID.
     * @param {(integer|string)} id - Budget ID
     * @param {function} [callback] - Optional callback
     */
    getCRPBudget(id, callback){
        return this.mapiRequest({
            'method': 'get',
            'path': `/v2/crp/budgets/${id}`,
            'handler': this.processJSON.bind(this),
            'callback': callback
        });
    }

    /**
     * Update CRP budget by ID.
     * @param {(integer|string)} id - Budget ID
     * @param {object} update
     * @param {(integer|string)} [update.amount]
     * @param {string} [update.startDate] - Start date of the budget, will be auto-converted to YYYY-MM-DD for convenience
     * @param {string} [update.endDate] - End date of the budget, will be auto-converted to YYYY-MM-DD for convenience
     * @param {string[]} [update.campaignIds]
     * @param {boolean} [update.isSuspended]
     * @param {function} [callback] - Optional callback
     */
    updateCRPBudget(id, update = {}, callback){
        update.startDate ? update.startDate = moment(update.startDate).format('YYYY-MM-DD') : null;
        update.endDate ? update.endDate = moment(update.endDate).format('YYYY-MM-DD') : null;
        return this.mapiRequest({
            'method': 'patch',
            'path': `/v2/crp/budgets/${id}`,
            'body': JSON.stringify(update),
            'handler': this.processJSON.bind(this),
            'callback': callback
        });
    }

    /**
     * Get CRP budgets, with optional filters.
     * @param {object} options
     * @param {string} [options.status] - Archived, Current or Scheduled
     * @param {boolean} [options.withBalance]
     * @param {boolean} [options.withSpend]
     * @param {string} [options.startBeforeDate] - Filter for budgets starting before a certain date, will be auto-converted to YYYY-MM-DD for convenience
     * @param {string} [options.endAfterDate] - Filter for budgets ending after a certain date, will be auto-converted to YYYY-MM-DD for convenience
     * @param {string} [options.campaignId]
     * @param {(integer|string)} [options.sellerId]
     * @param {string} [options.type] - Capped, Uncapped or Daily
     * @param {function} [callback] - Optional callback
     */
    getCRPBudgets(options = {}, callback){
        const data = {
            'status': options.status,
            'withBalance': options.withBalance,
            'withSpend': options.withSpend,
            'startBeforeDate': options.startBeforeDate ? moment(options.startBeforeDate).format('YYYY-MM-DD') : null,
            'endAfterDate': options.endAfterDate ? moment(options.endAfterDate).format('YYYY-MM-DD') : null,
            'campaignId': options.campaignId,
            'sellerId': options.sellerId,
            'type': options.type
        };
        return this.mapiRequest({
            'method': 'get',
            'path': `/v2/crp/budgets`,
            'query': data,
            'handler': this.processJSON.bind(this),
            'callback': callback
        });
    }

    /**
     * Update multiple CRP budgets.
     * @param {object[]} budgets
     * @param {(integer|string)} [budgets[].budgetId]
     * @param {(integer|string)} [budgets[].amount]
     * @param {string} [budgets[].startDate] - Start date of the budget, will be auto-converted to YYYY-MM-DD for convenience
     * @param {string} [budgets[].endDate] - End date of the budget, will be auto-converted to YYYY-MM-DD for convenience
     * @param {string[]} [budgets[].campaignIds]
     * @param {boolean} [budgets[].isSuspended]
     * @param {function} [callback] - Optional callback
     */
    updateCRPBudgets(budgets = [], callback){
        for (let budget of budgets){
            budget.startDate ? budget.startDate = moment(budget.startDate).format('YYYY-MM-DD') : null;
            budget.endDate ? budget.endDate = moment(budget.endDate).format('YYYY-MM-DD') : null;
        }
        return this.mapiRequest({
            'method': 'patch',
            'path': `/v2/crp/budgets`,
            'body': JSON.stringify(budgets),
            'handler': this.processJSON.bind(this),
            'callback': callback
        });
    }

    /**
     * Create one or more CRP budgets.
     * @param {object[]} budgets
     * @param {(integer|string)} [budgets[].amount]
     * @param {string} [budgets[].startDate] - Start date of the budget, will be auto-converted to YYYY-MM-DD for convenience
     * @param {string} [budgets[].endDate] - End date of the budget, will be auto-converted to YYYY-MM-DD for convenience
     * @param {string[]} [budgets[].campaignIds]
     * @param {string} [budgets[].budgetType] - Capped, Uncapped or Daily
     * @param {(integer|string)} [budgets[].sellerId]
     * @param {function} [callback] - Optional callback
     */
    createCRPBudgets(budgets = [], callback){
        for (let budget of budgets){
            budget.startDate ? budget.startDate = moment(budget.startDate).format('YYYY-MM-DD') : null;
            budget.endDate ? budget.endDate = moment(budget.endDate).format('YYYY-MM-DD') : null;
        }
        return this.mapiRequest({
            'method': 'post',
            'path': `/v2/crp/budgets`,
            'body': JSON.stringify(budgets),
            'handler': this.processJSON.bind(this),
            'callback': callback
        });
    }

    /**
     * Get campaign-level CRP data.
     * @param {object} options
     * @param {string} [options.intervalSize] - Hour, Day, Month or Year
     * @param {string} [options.clickAttributionPolicy] - SameSeller, AnySeller or Both
     * @param {string} [options.startDate] - Starting date string, will be auto-converted to ISO for convenience
     * @param {string} [options.endDate] - Ending date string, will be auto-converted to ISO for convenience
     * @param {string} [options.campaignId]
     * @param {(integer|string)} [options.count] - Limit of rows to return
     * @param {function} [callback] - Optional callback
     */
    getCRPStatsByCampaign(options = {}, callback){
        const data = {
            'intervalSize': options.intervalSize,
            'clickAttributionPolicy': options.clickAttributionPolicy,
            'startDate': options.startDate? new Date(options.startDate).toISOString() : null,
            'endDate': options.endDate ? new Date(options.endDate).toISOString() : null,
            'campaignId': options.campaignId,
            'count': options.count
        };
        return this.mapiRequest({
            'method': 'get',
            'path': `/v2/crp/stats/campaigns`,
            'query': data,
            'handler': this.processJSON.bind(this),
            'callback': callback
        });
    }

    /**
     * Get seller-level CRP data.
     * @param {object} options
     * @param {string} [options.intervalSize] - Hour, Day, Month or Year
     * @param {string} [options.clickAttributionPolicy] - SameSeller, AnySeller or Both
     * @param {string} [options.startDate] - Starting date string, will be auto-converted to ISO for convenience
     * @param {string} [options.endDate] - Ending date string, will be auto-converted to ISO for convenience
     * @param {(integer|string)} [options.sellerId]
     * @param {(integer|string)} [options.count] - Limit of rows to return
     * @param {function} [callback] - Optional callback
     */
    getCRPStatsBySeller(options = {}, callback){
        const data = {
            'intervalSize': options.intervalSize,
            'clickAttributionPolicy': options.clickAttributionPolicy,
            'startDate': options.startDate? new Date(options.startDate).toISOString() : null,
            'endDate': options.endDate ? new Date(options.endDate).toISOString() : null,
            'sellerId': options.sellerId,
            'count': options.count
        };
        return this.mapiRequest({
            'method': 'get',
            'path': `/v2/crp/stats/sellers`,
            'query': data,
            'handler': this.processJSON.bind(this),
            'callback': callback
        });
    }

    /**
     * Get seller campaign-level CRP data.
     * @param {object} options
     * @param {string} [options.intervalSize] - Hour, Day, Month or Year
     * @param {string} [options.clickAttributionPolicy] - SameSeller, AnySeller or Both
     * @param {string} [options.startDate] - Starting date string, will be auto-converted to ISO for convenience
     * @param {string} [options.endDate] - Ending date string, will be auto-converted to ISO for convenience
     * @param {(integer|string)} [options.sellerId]
     * @param {string} [options.campaignId]
     * @param {(integer|string)} [options.count] - Limit of rows to return
     * @param {function} [callback] - Optional callback
     */
    getCRPStatsBySellerCampaign(options = {}, callback){
        const data = {
            'intervalSize': options.intervalSize,
            'clickAttributionPolicy': options.clickAttributionPolicy,
            'startDate': options.startDate? new Date(options.startDate).toISOString() : null,
            'endDate': options.endDate ? new Date(options.endDate).toISOString() : null,
            'sellerId': options.sellerId,
            'campaignId': options.campaignId,
            'count': options.count
        };
        return this.mapiRequest({
            'method': 'get',
            'path': `/v2/crp/stats/seller-campaigns`,
            'query': data,
            'handler': this.processJSON.bind(this),
            'callback': callback
        });
    }

    /**
     * Get sellers by campaigns.
     * @deprecated
     * @param {object} options
     * @param {(integer|string)} [options.campaignIds] - Criteo campaign IDs, comma-separated
     * @param {boolean} [activeSellers=false] - Filter for active sellers
     * @param {boolean} [hasProducts=false] - Filter for sellers with products in the catalog.
     * @param {boolean} [activeBudgets=false] - Filter for sellers with active budgets.
     * @param {function} [callback] - Optional callback
     */
    getSellers(options = {}, activeSellers = false, hasProducts = false, activeBudgets = false, callback){
        const data = {
            'campaignIds': options.campaignIds,
            'onlyActiveSellers': activeSellers,
            'onlySellersWithProductsInCatalog': hasProducts,
            'onlyActiveBudgets': activeBudgets
        };
        return this.mapiRequest({
            'method': 'get',
            'path': `/v1/sellers`,
            'query': data,
            'handler': this.processJSON.bind(this),
            'callback': callback
        });
    }

    /**
     * Update seller bids by campaign.
     * @deprecated
     * @param {object} campaign
     * @param {string} campaign.campaignId
     * @param {object[]} campaign.sellerBids - An array of seller objects, specifying bid values.
     * @param {string} campaign.sellerBids[].sellerName
     * @param {(number|string)} campaign.sellerBids[].bid
     * @param {function} [callback] - Optional callback
     */
    updateSellerBids(campaign, callback){
        return this.mapiRequest({
            'method': 'put',
            'path': `/v1/sellers/bids`,
            'body': campaign,
            'handler': this.processJSON.bind(this),
            'callback': callback
        });
    }

    /**
     * Create seller budgets by campaign.
     * @deprecated
     * @param {object} campaign
     * @param {string} campaign.campaignId
     * @param {object[]} campaign.sellerBudgets - An array of seller objects, specifying budget details.
     * @param {string} campaign.sellerBudgets[].sellerName
     * @param {(number|string)} campaign.sellerBudgets[].amount
     * @param {string} campaign.sellerBudgets[].endDate - End date of the budget. Must be in ISO format.
     * @param {function} [callback] - Optional callback
     */
    createSellerBudgets(campaign, callback){
        return this.mapiRequest({
            'method': 'post',
            'path': `/v1/sellers/budgets`,
            'body': campaign,
            'handler': this.processJSON.bind(this),
            'callback': callback
        });
    }

    /**
     * Update seller budgets by campaign.
     * @deprecated
     * @param {object} campaign
     * @param {string} campaign.campaignId
     * @param {object[]} campaign.sellerBudgets - An array of seller objects, specifying budget details.
     * @param {(integer|string)} campaign.sellerBudgets[].budgetId
     * @param {(number|string)} [campaign.sellerBudgets[].amount] - Leave empty or set to null for uncapped budget.
     * @param {string} campaign.sellerBudgets[].endDate - End date of the budget. Must be in ISO format.
     * @param {string} [campaign.sellerBudgets[].status] - Active or Inactive
     * @param {function} [callback] - Optional callback
     */
    updateSellerBudgets(campaign, callback){
        return this.mapiRequest({
            'method': 'put',
            'path': `/v1/sellers/budgets`,
            'body': campaign,
            'handler': this.processJSON.bind(this),
            'callback': callback
        });
    }

    /**
     * Get seller campaigns by advertiser or list of campaigns.
     * @deprecated
     * @param {object} options
     * @param {string} [options.campaignIds] - List of campaign IDs, comma-separated.
     * @param {(integer|string)} [options.advertiserIds] - List of advertiser IDs, comma-separated.
     * @param {string} [options.status] - Running, Archived or NotRunning
     * @param {function} [callback] - Optional callback
     */
    getSellerCampaigns(options, status = true, callback){
        const data = {
            'campaignIds': options.campaignIds,
            'advertiserIds': options.advertiserIds,
            'status': options.status
        };
        return this.mapiRequest({
            'method': 'get',
            'path': `/v1/sellers/campaigns`,
            'query': data,
            'handler': this.processJSON.bind(this),
            'callback': callback
        });
    }

    /**
     * Get reporting for sellers.
     * @deprecated
     * @param {object} query
     * @param {(integer|string)} [query.advertiserIds] - List of advertiser IDs, comma-separated.
     * @param {string} query.startDate - Start date of the report, will be auto-converted to ISO for convenience
     * @param {string} query.endDate - End date of the report, will be auto-converted to ISO for convenience
     * @param {string[]} query.dimensions - CampaignId, AdvertiserId, Seller, Day, Week, Month and/or Year
     * @param {string[]} query.metrics - Clicks, AdvertiserCost and/or Displays
     * @param {string} query.format - CSV, Excel, XML or JSON
     * @param {string} [query.currency] - ISO Format, three letters
     * @param {string} [query.timezone] - GMT, PST or JST
     * @param {string} [filepath] - The directory path of a file to save the results to.
     * @param {function} [callback] - Optional callback
     */
    getSellerStats(query, filepath, callback){
        let handler = this.determineStatsHandler(query, filepath);
        query.startDate = new Date(query.startDate).toISOString();
        query.endDate = new Date(query.endDate).toISOString();
        return this.mapiRequest({
            'method': 'post',
            'path': `/v1/sellers/stats`,
            'body': JSON.stringify(query),
            'handler': handler,
            'callback': callback
        });
    }

    mapiRequest(r){
        return new Promise( (resolve, reject) => {
            this.checkAuthentication(r)
            .catch(this.authenticate.bind(this))
            .then(this.executeRequest.bind(this,r))
            .catch(this.decideWhetherToRequeue.bind(this,r))
            .then(this.resolveRequest.bind(this,r,resolve))
            .catch(this.rejectRequest.bind(this,r,reject))
        });
    }

    executeRequest(r){
        return this[r.method]({
                'path': r.path,
                'body': r.body,
                'query': r.query
            })
            .then(r.handler)
            .catch((err) => {
                return Promise.reject(err);
            })
    }

    decideWhetherToRequeue(r, err){
        return new Promise( (resolve, reject) => {
            if (err.toString().indexOf('401') > -1 && !r.retry){
                r.retry = true;
                resolve(this.mapiRequest(r));
            }else{
                reject(err);
            }
        });
    }

    resolveRequest(r, resolve, res){
        if (r.callback && !r.callbackExecuted){
            r.callbackExecuted = true;
            r.callback(null, res);
        }
        resolve(res);
    }

    rejectRequest(r, reject, err){
        if (r.callback && !r.callbackExecuted){
            r.callbackExecuted = true;
            r.callback(err)
        }else{
            reject(err);
        }
    }

    processAuth(res){
        return new Promise( (resolve, reject) => {
            try{
                const response = JSON.parse(res.body);
                this.token = response.access_token;
                resolve(this.token);
            }catch(e){
                reject(new Error('Error Retrieving Session Token from Authentication Response!'));
            }
        });
    }

    processJSON(res){
        return this.process(res, this.parseJSON);
    }

    processFile(filepath, res){
        return this.process(res, this.saveToFile.bind(this,filepath));
    }

    processResponse(res){
        return this.process(res, this.parseResponse);
    }

    process(res, parser){
        return new Promise( (resolve, reject) => {
            try{
                const status = res.response.statusCode;
                if (status.toString().match(/20[0-9]/) === null){
                    reject(new Error(`Bad Response From API: Status Code ${status} | ${res.body}`));
                }
                parser(res.body.trim(), resolve, reject);
            }catch(e){
                reject(new Error(`Error Parsing Response from API: Status Code ${status} | ${e}`));
            }
        });
    }

    parseJSON(body, resolve, reject){
        try {
            if (body){
                resolve(JSON.parse(body));
            }else{
                resolve(true);
            }
        }catch(e){
            reject(new Error(`Error Parsing JSON Response: ${e}`));
        }
    }

    parseResponse(body, resolve, reject){
        try {
            if (body){
                resolve(body);
            }else{
                resolve(true);
            }
        }catch(e){
            reject(new Error(`Error Parsing Response: ${e}`));
        }
    }

    saveToFile(filepath, body, resolve, reject){
        fs.writeFile(filepath, body, (err) => {
            if (err){
                reject(new Error(`Error Saving Response to File. ${err}`));
            }else{
                resolve(`Results saved to ${filepath}.`);
            }
        });
    }

    toFormData(obj){
        let formdata = '';
        for (const key in obj){
            formdata += `${key}=${obj[key]}&`
        }
        return formdata.slice(0,-1);
    }

    determineStatsHandler(query, filepath){
        if (filepath){
            return this.processFile.bind(this,filepath);
        }else if (query.format.toLowerCase() === 'json'){
            return this.processJSON.bind(this);
        }else{
            return this.processResponse.bind(this);
        }
    }

    get(req){
        return this.request('apiGet', req);
    }

    post(req){
        return this.request('apiPost', req);
    }

    put(req){
        return this.request('apiPut', req);
    }

    patch(req){
        return this.request('apiPatch', req);
    }

    delete(req){
        return this.request('apiDelete', req);
    }

    request(method, req){
        return this[method]({
            'path': this.endpoint + req.path,
            'body': req.body,
            'query': req.query,
            'headers': {
                'Authorization': `Bearer ${this.token}`,
                'Accept': 'application/json, text/xml',
                'Content-Type': 'application/json',
                'User-Agent': 'criteo-nodejs-client/0.9.4'
            }
        });
    }
}

module.exports = Criteo_MAPI_Client;
