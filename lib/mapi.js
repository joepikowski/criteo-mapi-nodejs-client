/**
 * Criteo MAPI Node.js Client
 * @version 0.8.1
 * @author Joe Pikowski <j.pikowski@criteo.com>
 */

const API_Client = require('./api_client.js');
const fs = require('fs');
const cookie = require('cookie');

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
            client_id: this.id,
            client_secret: this.secret,
            grant_type: 'client_credentials'
        };
        return this.mapiRequest({
            'method': 'post',
            'path': `/oauth2/token`,
            'data': this.toFormData(auth),
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
            'data': data,
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
            'data': data,
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
            'data': JSON.stringify(data),
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
            'data': JSON.stringify(data),
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
            'data': JSON.stringify(data),
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
            'data': JSON.stringify(data),
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
            'data': data,
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
            'data': options,
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
            'data': data,
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
            'data': options,
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
            'data': JSON.stringify(campaigns),
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
            'data': data,
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
            'data': JSON.stringify(catalogs),
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
            'data': JSON.stringify(data),
            'handler': this.processJSON.bind(this),
            'callback': callback
        });
    }

    /**
     * Get sellers by campaigns.
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
            'data': data,
            'handler': this.processJSON.bind(this),
            'callback': callback
        });
    }

    /**
     * Update seller bids by campaign.
     * @param {object} campaign
     * @param {(integer|string)} campaign.campaignId
     * @param {object[]} campaign.sellerBids - An array of seller objects, specifying bid values.
     * @param {string} campaign.sellerBids[].sellerName
     * @param {(number|string)} campaign.sellerBids[].bid
     * @param {function} [callback] - Optional callback
     */
    updateSellerBids(campaign, callback){
        return this.mapiRequest({
            'method': 'put',
            'path': `/v1/sellers/bids`,
            'data': campaign,
            'handler': this.processJSON.bind(this),
            'callback': callback
        });
    }

    /**
     * Create seller budgets by campaign.
     * @param {object} campaign
     * @param {(integer|string)} campaign.campaignId
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
            'data': campaign,
            'handler': this.processJSON.bind(this),
            'callback': callback
        });
    }

    /**
     * Update seller budgets by campaign.
     * @param {object} campaign
     * @param {(integer|string)} campaign.campaignId
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
            'data': campaign,
            'handler': this.processJSON.bind(this),
            'callback': callback
        });
    }

    /**
     * Get seller campaigns by advertiser or list of campaigns.
     * @param {object} options
     * @param {(integer|string)} [options.campaignIds] - List of campaign IDs, comma-separated.
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
            'data': data,
            'handler': this.processJSON.bind(this),
            'callback': callback
        });
    }

    /**
     * Get reporting for sellers.
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
            'data': JSON.stringify(query),
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
            'data': JSON.stringify(query),
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
        return this[r.method](r.path, r.data)
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

    get(path, data){
        return this.request('apiGet', path, data);
    }

    post(path, data){
        return this.request('apiPost', path, data);
    }

    put(path, data){
        return this.request('apiPut', path, data);
    }

    patch(path, data){
        return this.request('apiPatch', path, data);
    }

    delete(path, data){
        return this.request('apiDelete', path, data);
    }

    request(method, path, data){
        return this[method]({
            'path': this.endpoint + path,
            'body': data,
            'headers': {
                'Authorization': `Bearer ${this.token}`,
                'Accept': 'application/json',
                'Content-Type': 'application/json',
                'User-Agent': 'criteo-nodejs-client/0.8.1'
            }
        });
    }
}

module.exports = Criteo_MAPI_Client;
