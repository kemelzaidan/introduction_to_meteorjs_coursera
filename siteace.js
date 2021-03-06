Websites = new Mongo.Collection("websites");
Votes = new Mongo.Collection("votes");

// search index
var WebsitesIndex = new EasySearch.Index({
	collection: Websites,
	fields: ['title', 'description'],
	engine: new EasySearch.Minimongo({
		sort: function(){
			return {upVotes:-1, downVotes:-1, createOn:-1};
		}
	})
});

if (Meteor.isClient) {
	// Configuration
	Comments.ui.config({
   template: 'bootstrap'
	});


	/////
	// template helpers
	/////

	// Search box
	Template.navbar.helpers({
		websitesIndex: function (){
			return WebsitesIndex;
		}
	});

	// helper function that returns all available websites
	Template.website_list.helpers({
		// websites:function(){
		// 	return Websites.find({}, {sort:{upVotes:-1, downVotes:-1, createOn:-1}});
		// },

		websitesIndex: function (){
			return WebsitesIndex;
		}
	});

	/////
	// template events
	/////

	Template.website_item.events({
		"click .js-upvote":function(event){
			// example of how you can access the id for the website in the database
			// (this is the data context for the template)
			var website_id = this._id;
			var up_votes = this.upVotes;
			console.log("Up voting website with id "+website_id);
			// put the code in here to add a vote to a website!
			Websites.update({_id:website_id}, {$inc: {upVotes:1}});
			console.log("Up votes: "+up_votes);

			// insert the likes on the DB
			var description = this.description.toLowerCase();
			var title = this.title.toLowerCase();
			var regex = /[a-z\u00E0-\u00FC]{3,}/g; // grab just words >= 3 letters
			// create an array of undesired words
			var dontWant = ['i', 'a', 'an', 'am', 'the', 'this', 'that', 'those', 'then', 'than', 'you', 'he', 'she', 'us', 'we', 'were', 'it', 'was', 'for', 'at'];
			// create an array of words out of title and description
			var tokens = description.match(regex);
			var tokens2= title.match(regex);
			// function toRemove(element) {
			// 	return dontWant.indexOf(element) < 0;
			// }
			Array.prototype.push.apply(tokens, tokens2); // merge both arrays
			tokens = jQuery.unique(tokens); // remove duplicates
			// pop "non-words"
			tokens = tokens.filter(function(element){
				return dontWant.indexOf(element) < 0;
			});
			console.log("Tokens are: ", tokens);
			// convert tokens to votes object
			var votes = {};
			for (var i in tokens){
				votes[tokens[i]] = 1;
			}
			console.log('Votes are: ', votes);
			if (!Votes.findOne({userId: Meteor.userId()})) {
				var votesID = Votes.insert({userId: Meteor.userId()});
				Session.set('votesID', votesID);
			} else {
				var id = Votes.findOne({userId: Meteor.userId()});
				Session.set('votesID', id._id);
			}

			Votes.upsert({_id: Session.get('votesID')}, {$inc: votes });


			return false;// prevent the button from reloading the page
		},
		"click .js-downvote":function(event){

			// example of how you can access the id for the website in the database
			// (this is the data context for the template)
			var website_id = this._id;
			var down_votes = this.downVotes;
			console.log("Down voting website with id "+website_id);

			// put the code in here to remove a vote from a website!
			Websites.update({_id:website_id},
											{$inc: {downVotes:1}});
			console.log("Down votes: "+down_votes);

			return false;// prevent the button from reloading the page
		}
	});

	Template.website_form.events({
		"click .js-toggle-website-form":function(event){
			$("#website_form").toggle('slow');
		},

		"blur #url":function(event){
			console.log("event blur captured");
			var url = event.currentTarget.value;
			console.log("URL is: "+url);
			Meteor.call("requestWebsite", url, function(error, result){
				if(error){
					console.log("error", error);
				}
				if(result){
					console.log("result received!");
					$('#title').val(result.title);
					$('#description').val(result.description);
				}
			});
		}, // end of blur event

		"submit .js-save-website-form":function(event){

			// here is an example of how to get the url out of the form:
			var url = event.target.url.value;
			var title = event.target.title.value;
			var description = event.target.description.value;
			console.log("The url they entered is: "+url);

			//  put your website saving code in here!
			Websites.insert({url:url,
											title:title,
											description:description,
											createdOn:new Date(),
											createdBy:Meteor.user()._id,
											upVotes:0,
											downVotes:0
										});

			$("#website_form").toggle('slow');
			return false;// stop the form submit from reloading the page
		}
	});
}


if (Meteor.isServer) {

	Meteor.methods({
		requestWebsite:function(url){
			try {
				console.log("making the request to "+url);
				var result = HTTP.get(url, {followRedirects:true});
				console.log("Request to "+url+" returned successfully!");
				var cheerio = Meteor.npmRequire('cheerio');
				$ = cheerio.load(result.content);
				var answer = {};
				answer["title"] = $("title").text();
				answer["description"] = $('meta[name=description]').prop('content');
				console.log("Title: " + answer["title"]);
				console.log("Description: " + answer["description"]);
				return answer;
			} catch (e) {
				console.error('Request returned error: ', e);
			}
		} // end requestWebsite
	});

}

/////
// routing
/////
Router.configure({
	layoutTemplate: 'ApplicationLayout'
});

Router.route('/', function () {
	this.render('navbar', {
		to: 'navbar'
	});

  this.render('sitesList', {
		to:"main"
	});
});

Router.route('/website/:_id', function () {
	this.render('navbar', {
		to: 'navbar'
	});

	this.render('websiteDetails', {
		to: 'main',
		data: function () {
			return Websites.findOne({_id: this.params._id});
		}
	});
});
