# Criteo Node.js MAPI Client

### Features

- Promise and Callback compatible
- Authentication retry system
- Inline documentation (JSDoc specification)
- Save reporting results to file

### Installation

`$ npm install criteo-mapi`

### Basic Code Examples　

##### Initialization
``` js
const Criteo_MAPI = require( 'criteo-mapi' );

const criteo = new Criteo_MAPI( 'username', 'password' );
```

##### A Basic Request (Promise / then-able)

Results from an API request can be returned as a settled Javascript Promise:

``` js
criteo.getCampaignsByAdvertiser( '12345' )
	.then( (campaigns) => console.log(campaigns) )
	.catch ( (err) => console.log(err) )
```

##### A Basic Request (Callback)

Alternately, data can be returned via a standard callback function if one is provided as the final parameter:

``` js
criteo.getCategoriesByCampaign( '9876',  true , (err, categories) => {
	if (!err){
		console.log(categories);
	}
});
```

### Authentication Retry

Oauth2 Tokens retrieved from the `/oauth2/token` endpoint are valid for 5 minutes.

For the first request after initialization, the MAPI Client will request an authentication token based on the username and password provided and proceed with the request.

##### First Request (No Stored Auth)
![MAPI Authentication Retry](http://criteo.work/mapi/img/mapi-1.png)

For subsequent requests, the stored token may have become invalid for long-running processes. The MAPI Client will automatically detect the need for a refreshed token and retry a request that fails once because of a `401 Unauthorized` error.

##### Request with Expired or Invalid Token
![MAPI Authentication Retry](http://criteo.work/mapi/img/mapi-2.png)

### Other Features

##### Saving Reports to File

For reporting API calls, a filepath can be provided to optionally save results to a local path.

``` js
	const query = {
		'reportType': 'CampaignPerformance',
		'advertiserIds': '12345',
		'startDate': '2018-09-25',
		'endDate': '2018-09-26',
		'dimensions': [
			'AdvertiserId',
			'CampaignId'
		],
		'metrics': [
			'Displays',
			'Clicks',
			'AdvertiserCost'
		],
		'format': 'csv',
		'currency': 'USD',
		'timezone': 'PST'
	};

criteo.getStats(query, './reports/results.csv')
	.then( (res) => console.log(res) )
	.catch( (err) => console.log(err) )

```

### Further Documentation

[Full Technical Documentation - JSDoc](http://criteo.work/mapi/jsdoc/Criteo_MAPI_Client.html)

[MAPI Documentation (Criteo Help Center)](https://support.criteo.com/s/article?article=360001223829-Introduction-to-the-Criteo-Marketing-API&language=en_US)

[MAPI Spec and Test Tool (Swagger)](https://api.criteo.com/marketing/swagger/ui/index#/)

### License
[MIT](MIT-LICENSE)
