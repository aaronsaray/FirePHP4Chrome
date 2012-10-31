<?php
/**
 * The Tests Class
 *
 * This file contains the test class file used for TestRunner.php
 * @author Aaron Saray
 */

namespace FirePHP4Chrome;

/**
 * The Tests Class
 *
 * This contains the tests and loads the required FirePHP Core when necessary.
 */
class Tests implements \Iterator
{
	/**
	 * @var array the test array - corresponds to methods in this class
	 */
	protected $_tests = array(
		'LogMessage',
		'InfoMessage',
		'WarnMessage',
		'ErrorMessage'
	);

	/**
	 * @var int current position in the iterator
	 */
	protected $_iteratorKey = 0;

	/*********************************************************
	 * These are the tests that are ran for firephp4chrome
	 ********************************************************/

	/**
	 * Tests sending a log message
	 */
	protected function _testLogMessage()
	{

	}

	/**
	 * Runs the test based on the passed in ID
	 *
	 * @param $id the identifier from the tests array
	 * @throws \Exception when the test is not found
	 * @return string the method that is being ran
	 */
	public function run($id)
	{
		if (!isset($this->_tests[$id])) {
			throw new \Exception("The ID of [{$id}] is not a valid test ID.");
		}

		$methodName = '_test' . $this->_tests[$id];
		if (!method_exists($this, $methodName)) {
			throw new \Exception("This class does not contain the method: [{$methodName}]");
		}



		$this->$methodName();

		return "Ran test: {$this->_tests[$id]}";
	}




	/***************************************************************
	 * The following functions are used for the iterator interface
	 **************************************************************/

	/**
	 * Rewind array - used for iterator
	 */
	public function rewind()
	{
		$this->_iteratorKey = 0;
	}

	/**
	 * @return mixed the current item for the iterator
	 */
	public function current()
	{
		return $this->_tests[$this->_iteratorKey];
	}

	/**
	 * @return string the current position - for iterator
	 */
	public function key()
	{
		return $this->_iteratorKey;
	}

	/**
	 * increments the iterator key
	 */
	public function next()
	{
		$this->_iteratorKey++;
	}

	/**
	 * @return bool returns if this is a valid key or not
	 */
	public function valid()
	{
		return isset($this->_tests[$this->_iteratorKey]);
	}
}