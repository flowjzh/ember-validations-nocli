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

The first parameter could also be ignored. In that case, the computed property
maintains its own value and could be accessed with `<key>.content`.

```js
App.FooController = Ember.Controller.extend({
  post: Ember.computed.validatable({
    validations: {
      ...
    }
  });

  // Error could be fetched
  titleError: Ember.computed.readOnly('post.errors.title.firstObject');
  
  // The real model of the post
  postModel: Ember.computed.alias('post.content');
});

var store = ... // find DS store
var ctl = App.FooController.create();

// attribute value could be set in
ctl.set('post', store.createRecord('post'));
```

Mixins could also be passed in with the hash object, as same as
`Ember.Object.extend` takes.

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

An enhancement has been made so that the inline validator can take dependent
keys:

```js
validations: {
  startDate: {
    presence: { message: 'Start date is not set.' }
  },
  endDate: {
    presence: { message: 'End date is not set.' },
    inline: Em.Validations.validator('startDate', function() {
      // startDate is referenced so it's need to be in the dependent key
      if (this.get(this.property) < this.get('startDate'))
        return 'End date is earlier than start date.';
    })
  }
}
```

## Validation Inhibitors ##

Sometimes the validation is not required on the full data model, especially 
for a large model with belongsTo keys:

```js
// Validation rules of a post
validations: {
  title: { ... },
  content: { ... },
  author: true
}
```

In the above example, the `author` is a `belongsTo` relationship and itself
is a validatable object. We may have a requirement to edit and/or save the
post seperately, and validation errors won't affect each other.

In the original Ember Validation way, `if` and `unless` conditional
validators are aimed for this purpose but it doesn't work with validatable
objects like the `author`.

So the `validationInhibitors` is introduced:

```js
validations: ...,
validationInhibitors: function() {
  var inhibited = this.get('editTitleOnly');
  return {
    content: inhibited,
    author: inhibited 
  };
}.property('editTitleOnly').readOnly(); 
```
In this way, if the use case is only to edit `title`, neither `content` or
`author` would be validated and their `isValid` property evaluates to true.

The `validationInhibitors` could be used in a more fancy way. Say we have a
large `Person` model with 2 groups of properties: personal info, career
intention, which is required to be modified separately:

```js
var validationKeys = {
  personalInfo: ['name', 'currentEmail', 'currentMobile', 'startWorkYear',
   'birthDate', ...],
  careerIntention: ['expectedSalary', 'employmentStatus', ...]
}

App.Person = Em.Ojbect.extend(Ember.Validations.Mixin, {
  validations: ...,
  validationInhibitors: function() {
    var res = {};
    Ember.keys(validationKeys).forEach(function(key) {
      var inhibited = !this.get('editing.' + key);
      validationKeys[key].forEach(function(p) {
        res[p] = inhibited;
      });
    }, this);
    // Double check to ensure we have all the keys covered
    Ember.assert('Should have all keys in validations included as inhibitors',
      Ember.keys(res).length === Ember.keys(this.get('validations')).length);
    return res;
  }.properties('editing').readOnly()
});
```

In this way, validations are taken separately as what's pre-defined in
`validationKeys`.

[Licensed under the MIT license](http://www.opensource.org/licenses/mit-license.php)
