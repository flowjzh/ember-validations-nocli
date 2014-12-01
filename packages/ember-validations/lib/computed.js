Ember.computed.validatable = function(key, hash) {
  var proxy = Em.ObjectProxy.extend(Em.Validations.Mixin, hash).create();
  return function(dummy, value) {
    if (arguments.length > 1) {
      Em.set(this, key, value);
      return proxy.set('content', value);
    }
    var val = Em.get(this, key);
    proxy.set('content', val);
    return val ? proxy : val;
  }.property(key);
};


