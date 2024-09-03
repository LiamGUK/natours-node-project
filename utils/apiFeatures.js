class APIfeatures {
  constructor(query, queryString) {
    this.query = query;
    this.queryString = queryString;
  }

  filter() {
    // Get access to any query parameters included with request through params object - pass in to find method to have it filter and return only data that matches values from query params in endpoint request
    // First create a hard copy of params object - as need to filter out any pagination of sorting params that may be attached to the request
    const queryObj = { ...this.queryString };

    // Array of query params to ignore in request and filter out of above params object
    const excludeFields = ['page', 'sort', 'limit', 'fields'];

    // delete operator will remove a value from a object
    excludeFields.forEach((el) => delete queryObj[el]); // loop will check each item in the array and use delete on any matching object key

    // 1B) Advanced filtering
    // {difficulty: 'easy}, duration: {$gte: 5}};
    // gte, gt, lte, lt
    let queryStr = JSON.stringify(queryObj);
    queryStr = queryStr.replace(/\b(gte|gt|lte|lt)\b/g, (match) => `$${match}`);

    // find method auto attached to Tour class instance will convert to array and return all objects that match validation (passing in no arguments will return all objects)
    // let query = Tour.find(JSON.parse(queryStr));
    this.query = this.query.find(JSON.parse(queryStr));

    return this; // return the entire object to give access to all methods - can then chain method on new instance declaration below
  }

  sort() {
    if (this.queryString.sort) {
      const sortBy = this.queryString.sort.split(',').join(' ');
      this.query = this.query.sort(sortBy);
    } else {
      // Default for sorting value if not specified - will order by newest data object using createdAt timestamps
      this.query = this.query.sort('-createdAt'); // adding - operator at start of string will order in ascending order (lowest first)
    }

    return this; // return the entire object to give access to all methods - can then chain method on new instance declaration below
  }

  limitFields() {
    // 3) FIELD LIMITING - reducing amount of data returned to reduce bandwidth
    if (this.queryString.fields) {
      const fields = this.queryString.fields.split(',').join(' ');
      this.query = this.query.select(fields);
    } else {
      this.query = this.query.select('-__v'); // Adding - operator will exclude fields in response (will not return any keys labelled with __v)
    }

    return this; // return the entire object to give access to all methods - can then chain method on new instance declaration below
  }

  paginate() {
    // 4) PAGINATION
    const page = this.queryString.page * 1 || 1; // Convert to a number by multiplying string by 1
    const limit = this.queryString.limit * 1 || 100;
    const skip = (page - 1) * limit;

    // page=2&limit=10, 1-10 - page 1, 11-20 - page 2 etc...
    this.query = this.query.skip(skip).limit(limit);

    // NOT REQUIRED
    // if (this.queryString.page) {
    //   // countDocuments method will return the total number of documents attached to model (Total number of tours in DB)
    //   const numTours = await Tour.countDocuments();
    //   // Throwing error here will auto go to catch block below
    //   if (skip >= numTours) throw new Error('This page does not exist');
    // }

    return this; // return the entire object to give access to all methods - can then chain method on new instance declaration below
  }
}

module.exports = APIfeatures;
