<?php
namespace Szurubooru\Controllers;

final class AuthController extends AbstractController
{
	private $authService;
	private $userService;
	private $passwordService;
	private $inputReader;

	public function __construct(
		\Szurubooru\Services\AuthService $authService,
		\Szurubooru\Services\UserService $userService,
		\Szurubooru\Services\PasswordService $passwordService,
		\Szurubooru\Helpers\InputReader $inputReader)
	{
		$this->authService = $authService;
		$this->userService = $userService;
		$this->passwordService = $passwordService;
		$this->inputReader = $inputReader;
	}

	public function registerRoutes(\Szurubooru\Router $router)
	{
		$router->post('/api/login', [$this, 'login']);
		$router->put('/api/login', [$this, 'login']);
	}

	public function login()
	{
		if (isset($this->inputReader->userName) and isset($this->inputReader->password))
		{
			$this->authService->loginFromCredentials($this->inputReader->userName, $this->inputReader->password);
		}
		elseif (isset($this->inputReader->token))
		{
			$this->authService->loginFromToken($this->inputReader->token);
		}
		else
		{
			$this->authService->loginAnonymous();
		}

		return
		[
			'token' => new \Szurubooru\ViewProxies\Token($this->authService->getLoginToken()),
			'user' => new \Szurubooru\ViewProxies\User($this->authService->getLoggedInUser()),
			'privileges' => $this->authService->getCurrentPrivileges(),
		];
	}
}
