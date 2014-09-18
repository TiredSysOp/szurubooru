var App = App || {};
App.Presenters = App.Presenters || {};

App.Presenters.PagedCollectionPresenter = function(
	_,
	jQuery,
	util,
	promise,
	api,
	mousetrap,
	router,
	presenterManager,
	browsingSettings) {

	var $target;
	var targetContent;
	var endlessScroll = browsingSettings.getSettings().endlessScroll;
	var scrollInterval;
	var template;
	var totalPages;
	var forceClear = false;

	var pageNumber;
	var searchParams;
	var baseUri;
	var backendUri;
	var updateCallback;
	var failCallback;

	function init(args, loaded) {
		$target = args.$target;
		targetContent = jQuery(args.$target).html();

		baseUri = args.baseUri;
		backendUri = args.backendUri;
		updateCallback = args.updateCallback;
		failCallback = args.failCallback;

		promise.wait(util.promiseTemplate('pager'))
			.then(function(html) {
				template = _.template(html);
				render();
				loaded();
			});
	}

	function reinit(args, loaded) {
		forceClear = !_.isEqual(args.searchParams, searchParams) || parseInt(args.page) !== pageNumber + 1;

		searchParams = args.searchParams;
		pageNumber = parseInt(args.page) || 1;

		softChangePage(pageNumber)
			.then(loaded)
			.fail(loaded);

		if (!endlessScroll) {
			mousetrap.bind('a', function(e) {
				if (!e.altKey && !e.ctrlKey) {
					prevPage();
				}
			});
			mousetrap.bind('d', function(e) {
				if (!e.altKey && !e.ctrlKey) {
					nextPage();
				}
			});
		}
	}

	function prevPage() {
		if (pageNumber > 1) {
			changePage(pageNumber - 1);
		}
	}

	function nextPage() {
		if (pageNumber < totalPages) {
			changePage(pageNumber + 1);
		}
	}

	function nextPageInplace() {
		if (pageNumber < totalPages) {
			changePageInplace(pageNumber + 1);
		}
	}

	function changePageInplace(newPageNumber) {
		router.navigateInplace(getPageChangeLink(newPageNumber));
	}

	function changePage(newPageNumber) {
		router.navigate(getPageChangeLink(newPageNumber));
	}

	function showSpinner() {
		if (endlessScroll) {
			$target.find('.spinner').show();
		} else {
			presenterManager.showContentSpinner();
		}
	}

	function hideSpinner() {
		if (endlessScroll) {
			$target.find('.spinner').hide();
		} else {
			presenterManager.hideContentSpinner();
		}
	}

	function softChangePage(newPageNumber) {
		pageNumber = newPageNumber;

		showSpinner();

		return promise.make(function(resolve, reject) {
			promise.wait(
				api.get(backendUri, _.extend({}, searchParams, {page: pageNumber})))
					.then(function(response) {
						resolve(response);
						var pageSize = response.json.pageSize;
						var totalRecords = response.json.totalRecords;
						totalPages = Math.ceil(totalRecords / pageSize);

						updateCallback({
							entities: response.json.data,
							totalRecords: totalRecords},
							forceClear || !endlessScroll);
						forceClear = false;

						refreshPageList();
						hideSpinner();
						attachNextPageLoader();
					}).fail(function(response) {
						reject(response);
						if (typeof(failCallback) !== 'undefined') {
							failCallback(response);
						} else {
							console.log(new Error(response.json && response.json.error || response));
						}
					});
		});
	}

	function attachNextPageLoader() {
		if (!endlessScroll) {
			return;
		}

		window.clearInterval(scrollInterval);
		scrollInterval = window.setInterval(function() {
			var baseLine = $target.offset().top + $target.innerHeight();
			var scrollY = jQuery(window).scrollTop() + jQuery(window).height();
			if (scrollY > baseLine) {
				nextPageInplace();
				window.clearInterval(scrollInterval);
			}
		}, 100);
	}

	function refreshPageList() {
		var pages = getVisiblePages();
		$target.find('.page-list').empty();
		_.each(pages, function(page) {
			var $a = jQuery('<a/>');
			$a.addClass('big-button');
			$a.attr('href', getPageChangeLink(page));
			$a.text(page);
			if (page === pageNumber) {
				$a.addClass('active');
			}
			var $li = jQuery('<li/>');
			$li.append($a);
			$target.find('.page-list').append($li);
		});
	}

	function render() {
		$target.html(template({originalHtml: targetContent}));
		if (endlessScroll) {
			$target.find('.page-list').remove();
		} else {
			refreshPageList();
		}
	}

	function getVisiblePages() {
		var pages = [1, totalPages || 1];
		var pagesAroundCurrent = 2;
		for (var i = -pagesAroundCurrent; i <= pagesAroundCurrent; i ++) {
			if (pageNumber + i >= 1 && pageNumber + i <= totalPages) {
				pages.push(pageNumber + i);
			}
		}
		if (pageNumber - pagesAroundCurrent - 1 === 2) {
			pages.push(2);
		}
		if (pageNumber + pagesAroundCurrent + 1 === totalPages - 1) {
			pages.push(totalPages - 1);
		}

		return pages.sort(function(a, b) { return a - b; }).filter(function(item, pos) {
			return !pos || item !== pages[pos - 1];
		});
	}

	function getSearchChangeLink(newSearchParams) {
		return util.compileComplexRouteArgs(baseUri, _.extend({}, searchParams, newSearchParams, {page: 1}));
	}

	function getPageChangeLink(newPageNumber) {
		return util.compileComplexRouteArgs(baseUri, _.extend({}, searchParams, {page: newPageNumber}));
	}

	return {
		init: init,
		reinit: reinit,
		changePage: changePage,
		getSearchChangeLink: getSearchChangeLink,
		getPageChangeLink: getPageChangeLink
	};

};

App.DI.register('pagedCollectionPresenter', ['_', 'jQuery', 'util', 'promise', 'api', 'mousetrap', 'router', 'presenterManager', 'browsingSettings'], App.Presenters.PagedCollectionPresenter);
