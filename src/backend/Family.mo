persistent actor class Family(initRootName : Text, initFamilyId : Text) {

  var rootName : Text = initRootName;
  var familyId : Text = initFamilyId;
  var selfId : Text = "";

  public func initSelfId(id : Text) : async () {
    if (selfId == "") { selfId := id };
  };

  public query func whoAmI() : async Text {
    "I am the Family canister for \"" # rootName # "\" (familyId " # familyId # "), my canister id is " # selfId
  };

  public func setRootName(name : Text) : async () {
    rootName := name;
  };
};
