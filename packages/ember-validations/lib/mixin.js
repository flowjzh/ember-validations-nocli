var setValidityMixin = Ember.Mixin.create({
  isValid: function() {
    if (this.get('inhibitValidation')) return true;
    return this.get('validators').compact().isEvery('isValid');
  }.property('validators.@each.isValid', 'inhibitValidation').readOnly(),
  isInvalid: Ember.computed.not('isValid')
});

var pushValidatableObject = function(model, property) {
  var content = model.get(property);
  if (Ember.isNone(content)) return;

  model.removeObserver(property, model, pushValidatableObject);
  if (Ember.isArray(content)) {
    model.validators.pushObject(ArrayValidatorProxy.create({model: model, property: property, contentBinding: 'model.' + property}));
  } else {
    model.validators.pushObject(content);
    Ember.bind(model, 'validators.' + (model.validators.length - 1) + 
      '.inhibitValidation', 'validationInhibitors.' + property);
  }
};

var findValidator = function(validator) {
  var klass = validator.classify();
  return Ember.Validations.validators.local[klass] || Ember.Validations.validators.remote[klass];
};

var ArrayValidatorProxy = Ember.ArrayProxy.extend(setValidityMixin, {
  validate: function() {
    return this._validate();
  },
  _validate: function() {
    var promises = this.get('content').invoke('_validate').without(undefined);
    return Ember.RSVP.all(promises);
  }.on('init'),
  validators: Ember.computed.alias('content')
});

Ember.Validations.validator = function(callback) {
  var l = arguments.length,
      deps = new Array(l - 1);
  for (var i = 0; i < l - 1; i++)
    deps[i] = arguments[i];
  return { callback: arguments[l - 1], dependentKeys: deps };
};

Ember.Validations.Mixin = Ember.Mixin.create(setValidityMixin, {
  inhibitValidation: false,
  init: function() {
    this._super();
    this.errors = Ember.Validations.Errors.create();
    this._dependentValidationKeys = {};
    this.validators = Ember.makeArray();
    if (this.get('validations') === undefined) {
      this.validations = {};
    }
    this.buildValidators();
    this.validators.forEach(function(validator) {
      validator.addObserver('errors.[]', this, function(sender, key, value, context, rev) {
        var errors = Ember.makeArray();
        this.validators.forEach(function(validator) {
          if (validator.property === sender.property) {
            errors = errors.concat(validator.errors);
          }
        }, this);
        this.set('errors.' + sender.property, errors);
      });
    }, this);
    this.addObserver('inhibitValidation', this, this._validate);
  },
  buildValidators: function() {
    var property, validator;

    for (property in this.validations) {
      if (this.validations[property].callback)
        this.validations[property] = { inline: this.validations[property] };

      if (this.validations[property].constructor === Object) {
        this.buildRuleValidator(property);
      } else {
        this.buildObjectValidator(property);
      }
    }
  },
  buildRuleValidator: function(property) {
    var pushValidator = function(validator) {
      if (validator) {
        this.validators.pushObject(validator.create({
          model: this,
          property: property,
          options: this.validations[property][validatorName]
        }));
      }
    };

    var createInlineClass = function(inline) {
      return Ember.Validations.validators.Base.extend({
	_dependentValidationKeys: inline.dependentKeys,
        call: function() {
          var errorMessage = this.callback();

          if (errorMessage) {
            this.errors.pushObject(errorMessage);
          }
        },
        callback: inline.callback
      });
    };

    for (var validatorName in this.validations[property]) {
      if (validatorName === 'inline') {
        pushValidator.call(this,
          createInlineClass(this.validations[property][validatorName]));
      }
      else if (this.validations[property].hasOwnProperty(validatorName)) {
        pushValidator.call(this, findValidator(validatorName));
      }
    }
  },
  buildObjectValidator: function(property) {
    if (Ember.isNone(this.get(property))) {
      this.addObserver(property, this, pushValidatableObject);
    } else {
      pushValidatableObject(this, property);
    }
  },
  validate: function() {
    var self = this;
    // TODO: The rejected error doesn't contain errors in child objects
    return this._validate().then(function(valid) {
      var errors = self.get('errors');
      if (!valid) {
        return Ember.RSVP.reject(errors);
      }
      return errors;
    });
  },
  _validate: function() {
    var promises = this.validators.invoke('_validate').without(undefined);
    return Ember.RSVP.all(promises).then(function(vals) {
      return !vals.contains(false)
    });
  }.on('init')
});
