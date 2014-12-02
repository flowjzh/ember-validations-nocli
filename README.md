# Ember Validations #

This is a fork of [Ember Validations](https://github.com/dockyard/ember-validations),
which is mainly aimed to make it work with `bower install`.

## Building yourself ##

You will require Ruby to be installed on your system. If it is please
run the following:

```bash
gem install bundler
git clone git://github.com/dockyard/ember-validations.git
cd ember-validations
bundle install
bundle exec rake dist
```

The builds will be in the `dist/` directory.

## Usage ##

Please refer to the original usage guide:

https://github.com/dockyard/ember-validations/tree/v1.0.0

## Computed Validatable Attribute ##

Although the original design claims that Ember.Validations.Mixin could be
merged with any EmberObject, it's not quite convenient when applying it
with `ObjectController` wrapped model. The problem here is that validation
logic could be easily applied for the top most attributes of the model, by
defining the `validatioins` hash with the `ObjectController`. But for `hasMany`
and / or `belongsTo` relationships of that model, there seem to be noway to
define the `validatioins` hash other than defining it with the model.

We are seeking for a more elegant implementation where all validation logic is
defined with the controller. So the `Ember.computed.validatable` is introduced.

```js
App.PostModel = DS.Model.extend({
  author: DS.belongsTo('person');
  comments: DS.hasMany('comment');
});

App.PersonModel = DS.Model.extend({
  name: DS.attr('string');
  mobile: DS.belongsTo('mobile');
});

App.MobileModel = DS.Model.extend({
  number: DS.attr('string');
});

App.CommentModel = DS.Model.extend({
  ...
});

App.PostController = Ember.ObjectController.extend(Ember.Validations.Mixin, {

  // The original validation hash
  validations: {
    author: { presence: true }
  },
  
  // Wrap the belongsTo attribute with Ember.computed.validatable and define
  // the validations hash in it.
  author: Ember.computed.validatable('model.author', {

    validations: {
      name: { presence: true }
    },

    // belongsTo relationship could be wrapped recusively with validations
    // hash defined. 
    //
    mobile: Ember.computed.validatable('content.mobile', {
      validations: {
        number: {
          length: { maximum: 20, messages: { tooLong: 
            'Mobile phone number shoude be less than 20 characters.' }},
        }
      }
    })

  }); 

  // Has many relationship is also partially supported and single model is
  // required.
  //
  // This is the case that the particular model in the hasMany array is
  // being focused / edited and validation result is only required to be
  // shown on it.
  // 
  // If the focus changes to other models in the hasMany array, a computed
  // property could be used to switch the wrapped content of the validatable
  // attribute.
  //
  latestComment: Em.computed.validatable('model.comments.firstObject', {
    validations: {
      ...
    } 
  });

});
```

## Inline Validators ##

[Inline Validators](https://github.com/dockyard/ember-validations#inline-validators)
is back-ported as `Ember.Validations.validator`:

```js
User.create({
  validations: {
    name: {
      inline: Ember.Validations.validator(function() {
        if (this.model.get('canNotDoSomething')) {
          return "you can't do this!"
        }
      }) 
    }
  }
});
```

[Licensed under the MIT license](http://www.opensource.org/licenses/mit-license.php)
