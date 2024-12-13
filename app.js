const express = require("express");
const bodyParser = require("body-parser");
const ejs = require("ejs");
const mongoose = require("mongoose");
const session = require("express-session");
const { Blog, User } = require("./models/user-models");
const keys = require("./keys/keys");

const app = express();

app.set("view engine", "ejs");
const dbURI = keys.mongodb.dbURI;

mongoose.connect(dbURI).then((result) => console.log("connected to mongodb"));

app.use(bodyParser.urlencoded({ extended: true }));
app.use(express.static("public"));
app.use(
  session({
    secret: "Animeislife",
    resave: false,
    saveUninitialized: true,
  })
);

const requireLogin = (req, res, next) => {
  if (req.session && req.session.user) {
    next();
  } else {
    res.redirect("/login");
  }
};

app.get("/", (req, res) => {
  res.render("signup");
});

app.post("/", function (req, res) {
  User.findOne({
    username: req.body.name,
    password: req.body.password,
  }).then((currentUser) => {
    if (currentUser) {
      req.session.user = currentUser;
      res.redirect("/home");
    } else {
      const userdata = new User({
        username: req.body.name,
        password: req.body.password,
      });
      userdata.save().then((savedUser) => {
        req.session.user = savedUser;
        res.redirect("/home");
      });
    }
  });
});

app.get("/login", async (req, res) => {
  res.render("login");
});

app.post("/login", async function (req, res) {
  const userExists = await User.exists({
    username: req.body.name,
    password: req.body.password,
  });

  if (userExists) {
    const currentUser = await User.findOne({
      username: req.body.name,
      password: req.body.password,
    });
    req.session.user = currentUser;
    res.redirect("/home");
  } else {
    res.redirect("/");
  }
});

app.get("/home", requireLogin, function (req, res) {
  const category = req.query.category;
  const query = category ? { category } : {};

  Blog.find(query)
    .populate("author")
    .exec()
    .then((blogs) => {
      res.render("home", {
        blogs: blogs,
      });
    })
    .catch((err) => {
      console.log(err);
      res.redirect("/");
    });
});

app.get("/home/:id", requireLogin, async (req, res) => {
  const blog = await Blog.findById(req.params.id);
  if (blog && blog.author.toString() === req.session.user.username.toString()) {
    await Blog.findByIdAndDelete(req.params.id).then(() => {
      res.redirect("/home");
    });
  } else {
    res.redirect("/home");
  }
});

app.get("/compose", requireLogin, function (req, res) {
  res.render("compose", { username: req.session.user.username });
});

app.post("/compose", requireLogin, async function (req, res) {
  const article = new Blog({
    author: req.body.Author,
    title: req.body.title,
    content: req.body.blog,
    category: req.body.category,
  });

  const user = await User.findById(req.session.user._id);
  user.blogs.push(article);

  await Promise.all([user.save(), article.save()]);

  res.redirect("/home");
});

app.get("/edit/:id", requireLogin, async (req, res) => {
  const blog = await Blog.findById(req.params.id);
  if (blog && blog.author.toString() === req.session.user.username.toString()) {
    res.render("edit", {
      blogs: blog,
    });
  } else {
    res.redirect("/home");
  }
});

app.post("/edit/:id", requireLogin, async (req, res) => {
  const blog = await Blog.findById(req.params.id);
  if (blog && blog.author.toString() === req.session.user.username.toString()) {
    blog.author = req.body.Author;
    blog.title = req.body.title;
    blog.content = req.body.blog;
    blog.category = req.body.category;
    await blog.save();
  }
  res.redirect("/home");
});

const PORT = process.env.PORT || 3000;
app.listen(PORT, () => {
  console.log(`Server started on port ${PORT}`);
});
